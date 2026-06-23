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

moveInsRouter.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['welcomed_in_sm', 'assigned_ministers', 'bishopric_visit', 'notes', 'record_status'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabase.from('move_ins').update(updates).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
