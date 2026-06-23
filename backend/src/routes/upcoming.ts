import { Router } from 'express';
import { supabase } from '../db';

export const upcomingRouter = Router();

upcomingRouter.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('upcoming_ordinances')
    .select('*')
    .order('sort_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json(
    (data ?? []).map((r: any) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      date: r.date ?? null,
      nextStep: r.next_step,
    }))
  );
});
