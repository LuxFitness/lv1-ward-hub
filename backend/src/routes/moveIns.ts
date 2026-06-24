import { Router } from 'express';
import { supabase } from '../db';

export const moveInsRouter = Router();

moveInsRouter.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('move_ins')
    .select('*')
    .order('moved_in_date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

moveInsRouter.post('/', async (req, res) => {
  const { family_name, names, moved_in_date, record_status, notes } = req.body as {
    family_name: string;
    names: string;
    moved_in_date?: string;
    record_status?: string;
    notes?: string;
  };
  if (!family_name || !names) {
    return res.status(400).json({ error: 'family_name and names are required' });
  }
  const { data, error } = await supabase
    .from('move_ins')
    .insert({
      family_name: family_name.trim(),
      names: names.trim(),
      moved_in_date: moved_in_date ?? new Date().toISOString().slice(0, 10),
      record_status: record_status ?? 'pending',
      notes: notes ?? '',
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

moveInsRouter.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['welcomed_in_sm', 'assigned_ministers', 'bishopric_visit', 'notes', 'record_status'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabase.from('move_ins').update(updates).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
