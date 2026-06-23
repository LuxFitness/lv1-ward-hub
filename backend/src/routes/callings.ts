/**
 * Calling pipeline routes.
 *
 * All routes require authentication (requireAuth middleware applied at mount
 * point in server.ts — not repeated here).
 *
 * Security note (T-06-04): There is no DELETE route for callings or
 * calling_events. "Deletion" is modelled as a transition to 'cancelled'.
 * calling_events is append-only.
 */

import { Router } from 'express';
import { supabase } from '../db';
import { validateTransition } from '../lib/stateMachine';
import type { CallingStatus } from '../types';

export const callingsRouter = Router();

// ─── CALL-01, CALL-02: Roster with vacancy detection via JOIN (D-10) ─────────
//
// Vacancy is NOT a status value. A position is vacant when there is no active
// (non-terminal) calling linked to it. We fetch all active positions plus their
// callings (excluding terminal statuses), then return the flat array — frontend
// groups by org_unit. Rows with calling_id: null are vacant.
//
// Supabase JS .select() cannot express a partial JOIN condition in one pass, so
// we fetch all callings and filter terminal-status ones in application code.
callingsRouter.get('/', async (_req, res) => {
  // Fetch all active positions with their linked callings and members
  const { data: positions, error: posErr } = await supabase
    .from('positions')
    .select(
      `id, name, sort_order, notes, org_unit_id,
       callings!left(id, status, state_entered_at, member_id,
         members(name)
       )`
    )
    .eq('is_active', true)
    .order('sort_order');

  if (posErr) {
    return res.status(500).json({ error: posErr.message });
  }

  // Terminal statuses that should NOT count as "active" callings for a position
  const TERMINAL: CallingStatus[] = ['declined', 'released', 'cancelled'];

  // Flatten: each position becomes one row; active calling info merged in.
  // A position may have multiple callings (e.g. one active + historical
  // terminal records). We take the first NON-terminal calling if present.
  const roster = (positions ?? []).map((pos: any) => {
    const rawCallings: any[] = pos.callings ?? [];
    const activeCalling = rawCallings.find(
      (c: any) => !TERMINAL.includes(c.status as CallingStatus)
    );

    return {
      position_id: pos.id,
      position_name: pos.name,
      org_unit_id: pos.org_unit_id,
      sort_order: pos.sort_order,
      consideration_notes: pos.notes,
      calling_id: activeCalling?.id ?? null,
      member_id: activeCalling?.member_id ?? null,
      member_name: activeCalling?.members?.name ?? null,
      calling_status: activeCalling?.status ?? null,
      state_entered_at: activeCalling?.state_entered_at ?? null,
    };
  });

  res.json(roster);
});

// ─── CALL-06: Pending actions inbox ──────────────────────────────────────────
//
// Returns callings that have been stuck in a stage longer than the per-stage
// threshold. Route MUST be declared before '/:id/transition' so that Express
// does not try to match 'pending' as an :id parameter.
//
// Thresholds (D-06):
//   recommended  → 7 days
//   extended     → 3 days
//   accepted     → 14 days
//   sustained    → 14 days
callingsRouter.get('/pending', async (_req, res) => {
  const TERMINAL_STATUSES = ['set_apart', 'declined', 'released', 'cancelled'];

  const { data, error } = await supabase
    .from('callings')
    .select(
      `id, status, state_entered_at, position_id, member_id,
       positions(name, org_unit_id),
       members(name)`
    )
    .not('status', 'in', `("${TERMINAL_STATUSES.join('","')}")`);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const THRESHOLDS_DAYS: Partial<Record<CallingStatus, number>> = {
    recommended: 7,
    extended: 3,
    accepted: 14,
    sustained: 14,
  };

  const now = Date.now();

  const pending = (data ?? [])
    .map((c: any) => {
      const days_in_stage = (now - new Date(c.state_entered_at).getTime()) / 86_400_000;
      return { ...c, days_in_stage: Math.floor(days_in_stage) };
    })
    .filter((c: any) => {
      const threshold = THRESHOLDS_DAYS[c.status as CallingStatus];
      if (threshold === undefined) return false; // status has no threshold (shouldn't reach here)
      return c.days_in_stage >= threshold;
    })
    .sort((a: any, b: any) => b.days_in_stage - a.days_in_stage);

  res.json(pending);
});

// ─── CALL-09: Single calling detail ──────────────────────────────────────────
callingsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('callings')
    .select(`id, status, state_entered_at, bishopric_owner, notes, position_id,
             positions(name, org_unit_id, org_units(name)),
             members(name)`)
    .eq('id', id)
    .single();
  if (error || !data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// ─── CALL-03: Create pipeline entry ──────────────────────────────────────────
//
// Creates a new calling starting at 'recommended' and inserts the initial
// calling_event (from_status: null → to_status: 'recommended') for the audit
// log (D-11).
//
// Duplicate protection: the partial unique index
//   UNIQUE(position_id) WHERE status NOT IN ('declined','released','cancelled')
// prevents two active callings for the same position. Supabase returns error
// code '23505' on violation — surfaced as 409 (CALL-07 / D-12).
callingsRouter.post('/', async (req, res) => {
  const { position_id, member_id, bishopric_owner, notes } = req.body as {
    position_id: string;
    member_id?: string | null;
    bishopric_owner?: string | null;
    notes?: string | null;
  };

  if (!position_id) {
    return res.status(400).json({ error: 'position_id is required' });
  }

  const { data: calling, error } = await supabase
    .from('callings')
    .insert({
      position_id,
      member_id: member_id ?? null,
      bishopric_owner: bishopric_owner ?? null,
      notes: notes ?? null,
      status: 'recommended' as CallingStatus,
    })
    .select()
    .single();

  if (error) {
    // Partial unique index violation → 409 (CALL-07 / D-12 / T-06-02)
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'An active pipeline entry already exists for this position',
      });
    }
    return res.status(500).json({ error: error.message });
  }

  // Audit log: initial event from null → 'recommended' (D-11)
  await supabase.from('calling_events').insert({
    calling_id: calling.id,
    from_status: null,
    to_status: 'recommended' as CallingStatus,
    note: null,
  });

  res.status(201).json(calling);
});

// ─── CALL-04, CALL-05, CALL-08: Advance pipeline stage ───────────────────────
//
// Validates the transition server-side before any DB write (T-06-01).
// Always updates state_entered_at to now() — required for pending inbox
// "stuck for X days" logic (D-13 / CALL-08).
// Inserts audit calling_event (D-11).
callingsRouter.patch('/:id/transition', async (req, res) => {
  const { id } = req.params;
  const { status: toStatus, note } = req.body as {
    status: CallingStatus;
    note?: string;
  };

  if (!toStatus) {
    return res.status(400).json({ error: 'status is required' });
  }

  // Fetch current calling to get its status
  const { data: current, error: fetchError } = await supabase
    .from('callings')
    .select('id, status')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return res.status(404).json({ error: 'Calling not found' });
  }

  // Validate transition BEFORE any DB write (T-06-01)
  try {
    validateTransition(current.status as CallingStatus, toStatus);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }

  // D-13: MUST update state_entered_at on every transition (powers pending inbox)
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('callings')
    .update({
      status: toStatus,
      state_entered_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updated) {
    return res.status(500).json({ error: updateError?.message ?? 'Update failed' });
  }

  // Audit log: record the transition (D-11)
  await supabase.from('calling_events').insert({
    calling_id: id,
    from_status: current.status as CallingStatus,
    to_status: toStatus,
    note: note ?? null,
  });

  res.json(updated);
});
