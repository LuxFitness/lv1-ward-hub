import { Router } from 'express';
import { supabase } from '../db';

export const membersRouter = Router();

// MBR-01: List all members for typeahead (sorted by name)
membersRouter.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, created_at')
    .order('name', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

// MBR-01 + D-08: Create member inline from typeahead
membersRouter.post('/', async (req, res) => {
  const { name } = req.body as { name: string };
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name is required' });
  }
  const { data, error } = await supabase
    .from('members')
    .insert({ name: name.trim() })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// MBR-02: Edit member name
membersRouter.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body as { name: string };
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name is required' });
  }
  const { data, error } = await supabase
    .from('members')
    .update({ name: name.trim() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    // PGRST116 = "no rows returned" (PostgREST not-found code)
    if (error.code === 'PGRST116' || (!data && error.message === 'Not found')) {
      return res.status(404).json({ error: 'Member not found' });
    }
    return res.status(500).json({ error: error.message });
  }
  if (!data) return res.status(404).json({ error: 'Member not found' });
  res.json(data);
});

// MBR-02: Remove a member (schema has ON DELETE SET NULL on callings.member_id — safe to delete)
membersRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// MBR-03: View member's current active calling (set_apart status)
membersRouter.get('/:id/calling', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('callings')
    .select('id, status, positions(name, org_units(name))')
    .eq('member_id', id)
    .eq('status', 'set_apart')
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? null); // null = no active calling
});
