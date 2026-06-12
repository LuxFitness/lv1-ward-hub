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
vi.mock('../src/db', () => {
  const store: Record<string, any[]> = {
    callings: [],
    positions: [],
    members: [],
    calling_events: [],
  };

  let idCounter = 1;
  const newId = () => `id-${idCounter++}`;

  function buildChain(tableName: string) {
    const state: {
      table: string;
      filters: Array<(row: any) => boolean>;
      insertData?: any;
      updateData?: any;
      deleteOp?: boolean;
      selectFields?: string;
      singleRow?: boolean;
      maybeSingleRow?: boolean;
    } = {
      table: tableName,
      filters: [],
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
      insert(data: any) {
        state.insertData = data;
        return chain;
      },
      update(data: any) {
        state.updateData = data;
        return chain;
      },
      delete() {
        state.deleteOp = true;
        return chain;
      },
      order() {
        return chain;
      },
      single() {
        state.singleRow = true;
        return chain;
      },
      maybeSingle() {
        state.maybeSingleRow = true;
        return chain;
      },
      async then(resolve: (val: any) => any) {
        const rows = store[state.table] ?? [];

        // DELETE
        if (state.deleteOp) {
          let matched = [...rows];
          for (const f of state.filters) {
            matched = matched.filter(f);
          }
          const remaining = rows.filter((r) => !matched.includes(r));
          store[state.table] = remaining;
          return resolve({ data: null, error: null });
        }

        // INSERT
        if (state.insertData !== undefined) {
          const newRow = {
            id: newId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...state.insertData,
          };
          rows.push(newRow);
          store[state.table] = rows;
          if (state.singleRow) {
            return resolve({ data: newRow, error: null });
          }
          return resolve({ data: [newRow], error: null });
        }

        // UPDATE
        if (state.updateData !== undefined) {
          let matched = [...rows];
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

        // SELECT (including maybeSingle)
        let result = [...rows];
        for (const f of state.filters) {
          result = result.filter(f);
        }
        if (state.singleRow) {
          if (result.length === 0) {
            return resolve({ data: null, error: { message: 'Not found', code: 'PGRST116' } });
          }
          return resolve({ data: result[0], error: null });
        }
        if (state.maybeSingleRow) {
          return resolve({ data: result.length > 0 ? result[0] : null, error: null });
        }
        return resolve({ data: result, error: null });
      },
    };

    chain[Symbol.toStringTag] = 'Promise';
    return chain;
  }

  const supabase = {
    from(tableName: string) {
      return buildChain(tableName);
    },
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

// ─── App + helpers ─────────────────────────────────────────────────────────────
async function getApp() {
  const { app } = await import('../src/server');
  return app;
}

// Shared authenticated agent — avoids rate limiter (5/15min).
let _cachedAgent: ReturnType<typeof request.agent> | null = null;

async function authenticatedAgent() {
  if (_cachedAgent) return _cachedAgent;
  const app = await getApp();
  _cachedAgent = request.agent(app);
  await _cachedAgent
    .post('/api/auth/login')
    .send({ password: 'testpass' })
    .set('Content-Type', 'application/json');
  return _cachedAgent;
}

async function resetStore() {
  const { supabase } = await import('../src/db');
  (supabase as any)._reset();
}

async function getStore() {
  const { supabase } = await import('../src/db');
  return (supabase as any)._store as Record<string, any[]>;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/members', () => {
  it('requires authentication — returns 401 without session', async () => {
    const app = await getApp();
    const res = await request(app).get('/api/members');
    expect(res.status).toBe(401);
  });

  it('returns 200 with empty array when no members (MBR-01)', async () => {
    await resetStore();
    const agent = await authenticatedAgent();
    const res = await agent.get('/api/members');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('returns all members when members exist (MBR-01)', async () => {
    await resetStore();
    const store = await getStore();
    const now = new Date().toISOString();
    store.members = [
      { id: 'mem-1', name: 'Alice Smith', created_at: now },
      { id: 'mem-2', name: 'Bob Jones', created_at: now },
    ];

    const agent = await authenticatedAgent();
    const res = await agent.get('/api/members');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });
});

describe('POST /api/members', () => {
  it('requires authentication — returns 401 without session', async () => {
    const app = await getApp();
    const res = await request(app)
      .post('/api/members')
      .send({ name: 'New Member' });
    expect(res.status).toBe(401);
  });

  it('creates a member and returns 201 with created row (MBR-01 + D-08)', async () => {
    await resetStore();
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/members')
      .send({ name: 'Jane Doe' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Jane Doe');
    expect(res.body.id).toBeTruthy();
    expect(res.body.created_at).toBeTruthy();
  });

  it('trims leading and trailing whitespace from name', async () => {
    await resetStore();
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/members')
      .send({ name: '  John Smith  ' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('John Smith');
  });

  it('returns 400 when name is missing', async () => {
    await resetStore();
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/members')
      .send({})
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 400 when name is empty string', async () => {
    await resetStore();
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/members')
      .send({ name: '' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 400 when name is only whitespace', async () => {
    await resetStore();
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/members')
      .send({ name: '   ' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('ignores extra fields — only persists name (no email, phone, etc.)', async () => {
    await resetStore();
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/members')
      .send({ name: 'Alice', email: 'alice@example.com', phone: '555-1234' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Alice');
    expect(res.body.email).toBeUndefined();
    expect(res.body.phone).toBeUndefined();
  });
});

describe('PATCH /api/members/:id', () => {
  it('requires authentication — returns 401 without session', async () => {
    const app = await getApp();
    const res = await request(app)
      .patch('/api/members/some-id')
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(401);
  });

  it('updates a member name and returns 200 with updated row (MBR-02)', async () => {
    await resetStore();
    const agent = await authenticatedAgent();

    // Create a member first
    const created = await agent
      .post('/api/members')
      .send({ name: 'Original Name' })
      .set('Content-Type', 'application/json');
    expect(created.status).toBe(201);
    const memberId = created.body.id;

    // Update the member's name
    const res = await agent
      .patch(`/api/members/${memberId}`)
      .send({ name: 'Updated Name' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
    expect(res.body.id).toBe(memberId);
  });

  it('trims whitespace from updated name', async () => {
    await resetStore();
    const agent = await authenticatedAgent();

    const created = await agent
      .post('/api/members')
      .send({ name: 'Original' })
      .set('Content-Type', 'application/json');
    const memberId = created.body.id;

    const res = await agent
      .patch(`/api/members/${memberId}`)
      .send({ name: '  Trimmed Name  ' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Trimmed Name');
  });

  it('returns 400 when name is missing', async () => {
    await resetStore();
    const agent = await authenticatedAgent();
    const res = await agent
      .patch('/api/members/any-id')
      .send({})
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 404 for non-existent member', async () => {
    await resetStore();
    const agent = await authenticatedAgent();
    const res = await agent
      .patch('/api/members/non-existent-id')
      .send({ name: 'New Name' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/members/:id', () => {
  it('requires authentication — returns 401 without session', async () => {
    const app = await getApp();
    const res = await request(app).delete('/api/members/some-id');
    expect(res.status).toBe(401);
  });

  it('deletes a member and returns 204 no content (MBR-02)', async () => {
    await resetStore();
    const agent = await authenticatedAgent();

    // Create a member first
    const created = await agent
      .post('/api/members')
      .send({ name: 'To Delete' })
      .set('Content-Type', 'application/json');
    expect(created.status).toBe(201);
    const memberId = created.body.id;

    // Delete the member
    const res = await agent.delete(`/api/members/${memberId}`);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('member is removed from store after delete', async () => {
    await resetStore();
    const agent = await authenticatedAgent();

    const created = await agent
      .post('/api/members')
      .send({ name: 'Delete Me' })
      .set('Content-Type', 'application/json');
    const memberId = created.body.id;

    await agent.delete(`/api/members/${memberId}`);

    const store = await getStore();
    const found = store.members.find((m) => m.id === memberId);
    expect(found).toBeUndefined();
  });
});

describe('GET /api/members/:id/calling', () => {
  it('requires authentication — returns 401 without session', async () => {
    const app = await getApp();
    const res = await request(app).get('/api/members/some-id/calling');
    expect(res.status).toBe(401);
  });

  it('returns null when member has no active calling (MBR-03)', async () => {
    await resetStore();
    const agent = await authenticatedAgent();

    const created = await agent
      .post('/api/members')
      .send({ name: 'No Calling Member' })
      .set('Content-Type', 'application/json');
    const memberId = created.body.id;

    const res = await agent.get(`/api/members/${memberId}/calling`);
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it('returns the set_apart calling when member has active calling (MBR-03)', async () => {
    await resetStore();
    const store = await getStore();
    const now = new Date().toISOString();

    // Seed a set_apart calling for the member
    store.members.push({ id: 'mbr-active', name: 'Active Member', created_at: now });
    store.callings.push({
      id: 'calling-active',
      position_id: 'pos-1',
      member_id: 'mbr-active',
      status: 'set_apart',
      bishopric_owner: null,
      notes: null,
      state_entered_at: now,
      created_at: now,
      updated_at: now,
    });

    const agent = await authenticatedAgent();
    const res = await agent.get('/api/members/mbr-active/calling');
    expect(res.status).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.id).toBe('calling-active');
    expect(res.body.status).toBe('set_apart');
  });

  it('does NOT return a non-set_apart calling (e.g. recommended)', async () => {
    await resetStore();
    const store = await getStore();
    const now = new Date().toISOString();

    store.members.push({ id: 'mbr-pipeline', name: 'Pipeline Member', created_at: now });
    store.callings.push({
      id: 'calling-pipeline',
      position_id: 'pos-2',
      member_id: 'mbr-pipeline',
      status: 'recommended',
      bishopric_owner: null,
      notes: null,
      state_entered_at: now,
      created_at: now,
      updated_at: now,
    });

    const agent = await authenticatedAgent();
    const res = await agent.get('/api/members/mbr-pipeline/calling');
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });
});
