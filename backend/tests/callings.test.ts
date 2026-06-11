import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

// Set env vars BEFORE any imports that read them
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test-secret-at-least-32-chars-long!!';
  process.env.APP_PASSWORD_HASH = await bcrypt.hash('testpass', 10);
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  process.env.SUPABASE_DB_URL = 'postgresql://test:test@localhost/test';
});

// ─── Mock Supabase ────────────────────────────────────────────────────────────
// We mock the Supabase client to avoid needing a live DB in unit tests.
vi.mock('../src/db', () => {
  // In-memory store: records keyed by table name
  const store: Record<string, any[]> = {
    callings: [],
    positions: [],
    members: [],
    calling_events: [],
  };

  // Counter for unique IDs
  let idCounter = 1;
  const newId = () => `id-${idCounter++}`;

  // Reusable chainable builder
  function buildChain(tableName: string) {
    const state: {
      table: string;
      filters: Array<(row: any) => boolean>;
      insertData?: any;
      updateData?: any;
      selectFields?: string;
      singleRow?: boolean;
      notFilters?: Array<{ field: string; values: any[] }>;
    } = {
      table: tableName,
      filters: [],
      notFilters: [],
    };

    const chain: any = {
      select(fields?: string) {
        state.selectFields = fields;
        return chain;
      },
      eq(field: string, value: any) {
        state.filters.push((row: any) => row[field] === value);
        return chain;
      },
      not(field: string, operator: string, value: string) {
        // Handle .not('status', 'in', '("set_apart","declined","released","cancelled")')
        if (operator === 'in') {
          const vals = value.replace(/[()]/g, '').split(',').map((v) => v.trim().replace(/"/g, ''));
          state.notFilters!.push({ field, values: vals });
        }
        return chain;
      },
      insert(data: any) {
        state.insertData = data;
        return chain;
      },
      update(data: any) {
        state.updateData = data;
        return chain;
      },
      order() {
        return chain;
      },
      single() {
        state.singleRow = true;
        return chain;
      },
      async then(resolve: (val: any) => any) {
        const rows = store[state.table] ?? [];

        // INSERT
        if (state.insertData !== undefined) {
          const newRow = {
            id: newId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...state.insertData,
          };
          // Check partial unique index: UNIQUE(position_id) WHERE status NOT IN ('declined','released','cancelled')
          if (state.table === 'callings') {
            const terminal = ['declined', 'released', 'cancelled'];
            const duplicate = rows.find(
              (r) =>
                r.position_id === newRow.position_id &&
                !terminal.includes(r.status)
            );
            if (duplicate) {
              return resolve({
                data: null,
                error: { code: '23505', message: 'duplicate key value violates unique constraint' },
              });
            }
          }
          rows.push(newRow);
          store[state.table] = rows;
          if (state.singleRow) {
            return resolve({ data: newRow, error: null });
          }
          return resolve({ data: [newRow], error: null });
        }

        // UPDATE
        if (state.updateData !== undefined) {
          let matched = rows;
          for (const f of state.filters) {
            matched = matched.filter(f);
          }
          if (matched.length === 0) {
            return resolve({ data: null, error: { message: 'Not found' } });
          }
          const updated = { ...matched[0], ...state.updateData, updated_at: new Date().toISOString() };
          const idx = rows.indexOf(matched[0]);
          rows[idx] = updated;
          store[state.table] = rows;
          if (state.singleRow) {
            return resolve({ data: updated, error: null });
          }
          return resolve({ data: [updated], error: null });
        }

        // SELECT
        let result = [...rows];
        for (const f of state.filters) {
          result = result.filter(f);
        }
        for (const nf of state.notFilters ?? []) {
          result = result.filter((r) => !nf.values.includes(r[nf.field]));
        }
        if (state.singleRow) {
          if (result.length === 0) {
            return resolve({ data: null, error: { message: 'Not found', code: 'PGRST116' } });
          }
          return resolve({ data: result[0], error: null });
        }
        return resolve({ data: result, error: null });
      },
    };

    // Make it work as a Promise (then-able) and also directly awaitable
    chain[Symbol.toStringTag] = 'Promise';
    return chain;
  }

  const supabase = {
    from(tableName: string) {
      return buildChain(tableName);
    },
    // Expose store for test setup/teardown
    _store: store,
    _reset() {
      store.callings = [];
      store.positions = [];
      store.members = [];
      store.calling_events = [];
    },
    _seed(table: string, rows: any[]) {
      store[table] = [...rows];
    },
  };

  return { supabase };
});

// ─── App import ───────────────────────────────────────────────────────────────
async function getApp() {
  const { app } = await import('../src/server');
  return app;
}

// Helper: log in and return authenticated agent
async function authenticatedAgent() {
  const app = await getApp();
  const agent = request.agent(app);
  await agent
    .post('/api/auth/login')
    .send({ password: 'testpass' })
    .set('Content-Type', 'application/json');
  return agent;
}

// Helper: get the mock supabase store
async function getStore() {
  const { supabase } = await import('../src/db');
  return (supabase as any)._store as Record<string, any[]>;
}

async function resetStore() {
  const { supabase } = await import('../src/db');
  (supabase as any)._reset();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/callings', () => {
  it('requires authentication — returns 401 without session', async () => {
    const app = await getApp();
    const res = await request(app).get('/api/callings');
    expect(res.status).toBe(401);
  });

  it('returns 200 with array when authenticated', async () => {
    await resetStore();
    const agent = await authenticatedAgent();
    const res = await agent.get('/api/callings');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /api/callings', () => {
  it('requires authentication — returns 401 without session', async () => {
    const app = await getApp();
    const res = await request(app)
      .post('/api/callings')
      .send({ position_id: 'pos-1', member_id: 'mem-1' });
    expect(res.status).toBe(401);
  });

  it('creates a calling and returns 201 with the created record', async () => {
    await resetStore();
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/callings')
      .send({ position_id: 'pos-1', member_id: 'mem-1', bishopric_owner: 'Bishop' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body.position_id).toBe('pos-1');
    expect(res.body.member_id).toBe('mem-1');
    expect(res.body.status).toBe('recommended');
  });

  it('inserts a calling_event record on create (D-11)', async () => {
    await resetStore();
    const agent = await authenticatedAgent();
    await agent
      .post('/api/callings')
      .send({ position_id: 'pos-2', member_id: 'mem-1' })
      .set('Content-Type', 'application/json');

    const store = await getStore();
    expect(store.calling_events.length).toBeGreaterThanOrEqual(1);
    const evt = store.calling_events[0];
    expect(evt.from_status).toBeNull();
    expect(evt.to_status).toBe('recommended');
  });

  it('returns 409 when another active pipeline already exists for position_id (CALL-07)', async () => {
    await resetStore();
    const agent = await authenticatedAgent();

    // Create first calling
    const first = await agent
      .post('/api/callings')
      .send({ position_id: 'pos-dupe', member_id: 'mem-1' })
      .set('Content-Type', 'application/json');
    expect(first.status).toBe(201);

    // Try to create another for the same position
    const second = await agent
      .post('/api/callings')
      .send({ position_id: 'pos-dupe', member_id: 'mem-2' })
      .set('Content-Type', 'application/json');
    expect(second.status).toBe(409);
    expect(second.body.error).toBeTruthy();
  });
});

describe('PATCH /api/callings/:id/transition', () => {
  it('requires authentication — returns 401 without session', async () => {
    const app = await getApp();
    const res = await request(app)
      .patch('/api/callings/some-id/transition')
      .send({ status: 'extended' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when transition is invalid (validateTransition throws) (CALL-05)', async () => {
    await resetStore();
    const agent = await authenticatedAgent();

    // Create a calling in 'recommended' state
    const created = await agent
      .post('/api/callings')
      .send({ position_id: 'pos-t1', member_id: 'mem-1' })
      .set('Content-Type', 'application/json');
    expect(created.status).toBe(201);
    const callingId = created.body.id;

    // Attempt invalid transition: recommended → accepted (must go through extended)
    const res = await agent
      .patch(`/api/callings/${callingId}/transition`)
      .send({ status: 'accepted' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid transition/i);
  });

  it('returns 200 and updates status on valid transition (CALL-04)', async () => {
    await resetStore();
    const agent = await authenticatedAgent();

    const created = await agent
      .post('/api/callings')
      .send({ position_id: 'pos-t2', member_id: 'mem-1' })
      .set('Content-Type', 'application/json');
    const callingId = created.body.id;

    const res = await agent
      .patch(`/api/callings/${callingId}/transition`)
      .send({ status: 'extended' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('extended');
  });

  it('updates state_entered_at on every transition (CALL-08 / D-13)', async () => {
    await resetStore();
    const agent = await authenticatedAgent();

    const created = await agent
      .post('/api/callings')
      .send({ position_id: 'pos-t3', member_id: 'mem-1' })
      .set('Content-Type', 'application/json');
    const callingId = created.body.id;
    const originalEnteredAt = created.body.state_entered_at;

    // Wait 2ms to ensure timestamp is different
    await new Promise((r) => setTimeout(r, 2));

    const res = await agent
      .patch(`/api/callings/${callingId}/transition`)
      .send({ status: 'extended' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.state_entered_at).not.toBe(originalEnteredAt);
  });

  it('inserts a calling_event audit record on transition (D-11)', async () => {
    await resetStore();
    const agent = await authenticatedAgent();

    const created = await agent
      .post('/api/callings')
      .send({ position_id: 'pos-t4', member_id: 'mem-1' })
      .set('Content-Type', 'application/json');
    const callingId = created.body.id;

    await agent
      .patch(`/api/callings/${callingId}/transition`)
      .send({ status: 'extended' })
      .set('Content-Type', 'application/json');

    const store = await getStore();
    const events = store.calling_events.filter((e) => e.calling_id === callingId);
    // Should have create event + transition event = 2
    expect(events.length).toBeGreaterThanOrEqual(2);
    const transitionEvt = events.find((e) => e.from_status === 'recommended' && e.to_status === 'extended');
    expect(transitionEvt).toBeTruthy();
  });

  it('returns 404 for non-existent calling', async () => {
    await resetStore();
    const agent = await authenticatedAgent();

    const res = await agent
      .patch('/api/callings/non-existent-id/transition')
      .send({ status: 'extended' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(404);
  });
});

describe('GET /api/callings/pending', () => {
  it('requires authentication — returns 401 without session', async () => {
    const app = await getApp();
    const res = await request(app).get('/api/callings/pending');
    expect(res.status).toBe(401);
  });

  it('returns 200 with array', async () => {
    await resetStore();
    const agent = await authenticatedAgent();
    const res = await agent.get('/api/callings/pending');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns stuck callings with days_in_stage field', async () => {
    await resetStore();
    const store = await getStore();

    // Seed a calling stuck in 'recommended' for 8 days (threshold is 7)
    const stuckDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    store.callings.push({
      id: 'stuck-1',
      position_id: 'pos-stuck',
      member_id: 'mem-1',
      status: 'recommended',
      state_entered_at: stuckDate,
      bishopric_owner: null,
      notes: null,
      created_at: stuckDate,
      updated_at: stuckDate,
    });

    const agent = await authenticatedAgent();
    const res = await agent.get('/api/callings/pending');

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const stuck = res.body.find((c: any) => c.id === 'stuck-1');
    expect(stuck).toBeTruthy();
    expect(stuck.days_in_stage).toBeGreaterThanOrEqual(7);
  });

  it('does NOT return callings within their threshold', async () => {
    await resetStore();
    const store = await getStore();

    // Seed a calling in 'recommended' for only 3 days (threshold is 7)
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    store.callings.push({
      id: 'fresh-1',
      position_id: 'pos-fresh',
      member_id: 'mem-1',
      status: 'recommended',
      state_entered_at: recentDate,
      bishopric_owner: null,
      notes: null,
      created_at: recentDate,
      updated_at: recentDate,
    });

    const agent = await authenticatedAgent();
    const res = await agent.get('/api/callings/pending');

    expect(res.status).toBe(200);
    const found = res.body.find((c: any) => c.id === 'fresh-1');
    expect(found).toBeUndefined();
  });

  it('does NOT return terminal-status callings (set_apart, declined, released, cancelled)', async () => {
    await resetStore();
    const store = await getStore();

    // Seed set_apart calling that is "old" — should NOT appear in pending
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    store.callings.push({
      id: 'set-apart-1',
      position_id: 'pos-sa',
      member_id: 'mem-1',
      status: 'set_apart',
      state_entered_at: oldDate,
      bishopric_owner: null,
      notes: null,
      created_at: oldDate,
      updated_at: oldDate,
    });

    const agent = await authenticatedAgent();
    const res = await agent.get('/api/callings/pending');

    expect(res.status).toBe(200);
    const found = res.body.find((c: any) => c.id === 'set-apart-1');
    expect(found).toBeUndefined();
  });
});
