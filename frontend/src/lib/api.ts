import {
  MOCK_ROSTER, MOCK_PENDING, MOCK_MEMBERS, MOCK_CALLINGS,
  MOCK_UPCOMING, MOCK_SACRAMENT_WEEKS, MOCK_MOVE_INS, MOCK_AGENDAS,
} from './mockData';
import type { MeetingAgenda, AgendaItem, ActionItem } from './mockData';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
export const IS_MOCK = import.meta.env.VITE_MOCK === 'true';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Mutable copies so edits survive for the session
const mockSacramentWeeks = MOCK_SACRAMENT_WEEKS.map(w => ({ ...w, speakers: [...w.speakers] }));
const mockAgendas: MeetingAgenda[] = MOCK_AGENDAS.map(a => ({
  ...a,
  agenda_items: [...a.agenda_items],
  action_items: [...a.action_items],
}));

function mockResponse(path: string, options?: RequestInit): unknown {
  const method = options?.method?.toUpperCase() ?? 'GET';

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (path === '/api/auth/check') return { authenticated: true };

  // ── Upcoming ordinances ───────────────────────────────────────────────────
  if (path === '/api/upcoming') return MOCK_UPCOMING;

  // ── Sacrament ─────────────────────────────────────────────────────────────
  if (path === '/api/sacrament' && method === 'GET') return mockSacramentWeeks;

  const sacramentSyncMatch = path === '/api/sacrament/sync-sheets';
  if (sacramentSyncMatch && method === 'POST') {
    return { ok: true, direction: 'pull', synced: 0, message: 'Sync is a no-op in mock mode' };
  }

  const sacramentPatchMatch = path.match(/^\/api\/sacrament\/([^/]+)$/);
  if (sacramentPatchMatch && method === 'PATCH') {
    const id = sacramentPatchMatch[1];
    const updates = options?.body ? JSON.parse(options.body as string) : {};
    const idx = mockSacramentWeeks.findIndex(w => w.id === id);
    if (idx === -1) throw new ApiError(404, 'Week not found');
    Object.assign(mockSacramentWeeks[idx], updates);
    return { ...mockSacramentWeeks[idx] };
  }

  // ── Move-ins ──────────────────────────────────────────────────────────────
  if (path === '/api/move-ins') return MOCK_MOVE_INS;

  // ── Callings ──────────────────────────────────────────────────────────────
  if (path === '/api/callings' && method === 'GET') return MOCK_ROSTER;
  if (path === '/api/callings/pending') return MOCK_PENDING;
  if (path === '/api/members') return MOCK_MEMBERS;

  const callingDetailMatch = path.match(/^\/api\/callings\/([^/]+)$/);
  if (callingDetailMatch && method === 'GET') {
    const id = callingDetailMatch[1];
    const calling = MOCK_CALLINGS.find(c => c.id === id);
    if (!calling) throw new ApiError(404, 'Not found');
    return calling;
  }
  if (callingDetailMatch && method === 'PATCH') {
    const id = callingDetailMatch[1];
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const calling = MOCK_CALLINGS.find(c => c.id === id);
    if (!calling) throw new ApiError(404, 'Not found');
    return { ...calling, status: body.status };
  }

  // ── Agenda ────────────────────────────────────────────────────────────────
  if (path.startsWith('/api/agenda')) {
    // GET /api/agenda?type=bishopric|ward_council
    if (path === '/api/agenda' || path.startsWith('/api/agenda?')) {
      const url = new URL(path, 'http://x');
      const type = url.searchParams.get('type');
      return type ? mockAgendas.filter(a => a.meeting_type === type) : mockAgendas;
    }

    // POST /api/agenda/:id/items
    const addItemMatch = path.match(/^\/api\/agenda\/([^/]+)\/items$/);
    if (addItemMatch && method === 'POST') {
      const agendaId = addItemMatch[1];
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const agenda = mockAgendas.find(a => a.id === agendaId);
      if (!agenda) throw new ApiError(404, 'Agenda not found');
      const newItem: AgendaItem = {
        id: `item_${Date.now()}`,
        title: body.title,
        details: body.details ?? null,
        owner: body.owner ?? null,
        status: 'pending',
        sort_order: agenda.agenda_items.length,
      };
      agenda.agenda_items.push(newItem);
      return newItem;
    }

    // PATCH /api/agenda/items/:itemId
    const patchItemMatch = path.match(/^\/api\/agenda\/items\/([^/]+)$/);
    if (patchItemMatch && method === 'PATCH') {
      const itemId = patchItemMatch[1];
      const body = options?.body ? JSON.parse(options.body as string) : {};
      for (const agenda of mockAgendas) {
        const idx = agenda.agenda_items.findIndex(i => i.id === itemId);
        if (idx !== -1) {
          Object.assign(agenda.agenda_items[idx], body);
          return agenda.agenda_items[idx];
        }
      }
      throw new ApiError(404, 'Item not found');
    }

    // DELETE /api/agenda/items/:itemId
    const deleteItemMatch = path.match(/^\/api\/agenda\/items\/([^/]+)$/);
    if (deleteItemMatch && method === 'DELETE') {
      const itemId = deleteItemMatch[1];
      for (const agenda of mockAgendas) {
        const idx = agenda.agenda_items.findIndex(i => i.id === itemId);
        if (idx !== -1) { agenda.agenda_items.splice(idx, 1); return null; }
      }
      throw new ApiError(404, 'Item not found');
    }

    // POST /api/agenda/:id/actions
    const addActionMatch = path.match(/^\/api\/agenda\/([^/]+)\/actions$/);
    if (addActionMatch && method === 'POST') {
      const agendaId = addActionMatch[1];
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const agenda = mockAgendas.find(a => a.id === agendaId);
      if (!agenda) throw new ApiError(404, 'Agenda not found');
      const newAction: ActionItem = {
        id: `action_${Date.now()}`,
        title: body.title,
        owner: body.owner ?? null,
        due_date: body.due_date ?? null,
        completed: false,
        completed_at: null,
      };
      agenda.action_items.push(newAction);
      return newAction;
    }

    // PATCH /api/agenda/actions/:actionId
    const patchActionMatch = path.match(/^\/api\/agenda\/actions\/([^/]+)$/);
    if (patchActionMatch && method === 'PATCH') {
      const actionId = patchActionMatch[1];
      const body = options?.body ? JSON.parse(options.body as string) : {};
      for (const agenda of mockAgendas) {
        const idx = agenda.action_items.findIndex(a => a.id === actionId);
        if (idx !== -1) {
          if (body.completed === true && !body.completed_at) {
            body.completed_at = new Date().toISOString();
          } else if (body.completed === false) {
            body.completed_at = null;
          }
          Object.assign(agenda.action_items[idx], body);
          return agenda.action_items[idx];
        }
      }
      throw new ApiError(404, 'Action item not found');
    }

    // DELETE /api/agenda/actions/:actionId
    const deleteActionMatch = path.match(/^\/api\/agenda\/actions\/([^/]+)$/);
    if (deleteActionMatch && method === 'DELETE') {
      const actionId = deleteActionMatch[1];
      for (const agenda of mockAgendas) {
        const idx = agenda.action_items.findIndex(a => a.id === actionId);
        if (idx !== -1) { agenda.action_items.splice(idx, 1); return null; }
      }
      throw new ApiError(404, 'Action item not found');
    }
  }

  return null;
}

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  if (IS_MOCK) {
    await new Promise(r => setTimeout(r, 120));
    return mockResponse(path, options) as T;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
