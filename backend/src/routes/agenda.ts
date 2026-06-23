/**
 * Meeting agenda routes (Bishopric + Ward Council + PEC).
 *
 * Meetings are identified by type + date. Agenda items and action items
 * are nested under a meeting. Action items carry forward visually across
 * meetings until marked complete.
 */

import { Router } from 'express';
import { supabase } from '../db';

export const agendaRouter = Router();

// ── List meetings for a type ──────────────────────────────────────────────────

agendaRouter.get('/', async (req, res) => {
  const { type } = req.query as { type?: string };
  const validTypes = ['bishopric', 'ward_council', 'pec'];

  let query = supabase
    .from('meeting_agendas')
    .select(`
      *,
      agenda_items(*),
      action_items(*)
    `)
    .order('meeting_date', { ascending: false })
    .limit(8);

  if (type && validTypes.includes(type)) {
    query = query.eq('meeting_type', type);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

// ── Create meeting ────────────────────────────────────────────────────────────

agendaRouter.post('/', async (req, res) => {
  const { meeting_type, meeting_date, notes } = req.body as {
    meeting_type: 'bishopric' | 'ward_council' | 'pec';
    meeting_date: string;
    notes?: string;
  };

  if (!meeting_type || !meeting_date) {
    return res.status(400).json({ error: 'meeting_type and meeting_date are required' });
  }

  const { data, error } = await supabase
    .from('meeting_agendas')
    .insert({ meeting_type, meeting_date, notes: notes ?? null })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Meeting for that type and date already exists' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

// ── Update meeting notes ──────────────────────────────────────────────────────

agendaRouter.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body as { notes?: string };

  const { data, error } = await supabase
    .from('meeting_agendas')
    .update({ notes: notes ?? null })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Meeting not found' });
  res.json(data);
});

// ── Agenda item CRUD ──────────────────────────────────────────────────────────

agendaRouter.post('/:id/items', async (req, res) => {
  const { id: agenda_id } = req.params;
  const { title, details, owner, sort_order = 0 } = req.body as {
    title: string; details?: string; owner?: string; sort_order?: number;
  };

  if (!title) return res.status(400).json({ error: 'title is required' });

  const { data, error } = await supabase
    .from('agenda_items')
    .insert({ agenda_id, title, details: details ?? null, owner: owner ?? null, sort_order })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

agendaRouter.patch('/items/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const ALLOWED = new Set(['title', 'details', 'owner', 'status', 'sort_order']);
  const safe = Object.fromEntries(
    Object.entries(req.body as Record<string, unknown>).filter(([k]) => ALLOWED.has(k))
  );

  if (Object.keys(safe).length === 0) return res.status(400).json({ error: 'No valid fields' });

  const { data, error } = await supabase
    .from('agenda_items')
    .update(safe)
    .eq('id', itemId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Item not found' });
  res.json(data);
});

agendaRouter.delete('/items/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const { error } = await supabase.from('agenda_items').delete().eq('id', itemId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// ── Action item CRUD ──────────────────────────────────────────────────────────

agendaRouter.post('/:id/actions', async (req, res) => {
  const { id: agenda_id } = req.params;
  const { title, owner, due_date } = req.body as {
    title: string; owner?: string; due_date?: string;
  };

  if (!title) return res.status(400).json({ error: 'title is required' });

  const { data, error } = await supabase
    .from('action_items')
    .insert({ agenda_id, title, owner: owner ?? null, due_date: due_date ?? null })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

agendaRouter.patch('/actions/:actionId', async (req, res) => {
  const { actionId } = req.params;
  const updates = req.body as Partial<Record<string, unknown>>;

  // Auto-set completed_at when flipping to complete
  if (updates.completed === true && !updates.completed_at) {
    updates.completed_at = new Date().toISOString();
  } else if (updates.completed === false) {
    updates.completed_at = null;
  }

  const ALLOWED = new Set(['title', 'owner', 'due_date', 'completed', 'completed_at']);
  const safe = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED.has(k))
  );

  const { data, error } = await supabase
    .from('action_items')
    .update(safe)
    .eq('id', actionId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Action item not found' });
  res.json(data);
});

agendaRouter.delete('/actions/:actionId', async (req, res) => {
  const { actionId } = req.params;
  const { error } = await supabase.from('action_items').delete().eq('id', actionId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});
