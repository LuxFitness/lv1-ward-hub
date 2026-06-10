import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

// Must set env vars before importing app (server.ts reads them at module init)
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test-secret-at-least-32-chars-long!!';
  process.env.APP_PASSWORD_HASH = await bcrypt.hash('testpass', 10);
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  process.env.SUPABASE_DB_URL = 'postgresql://test:test@localhost/test';
});

// Lazy-import the app after env vars are set
async function getApp() {
  // Clear module cache to ensure fresh import with env vars set
  const { app } = await import('../src/server');
  return app;
}

describe('POST /api/auth/login', () => {
  it('returns 200 and { ok: true } with correct password', async () => {
    const app = await getApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'testpass' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 401 with { error: "Invalid credentials" } for wrong password', async () => {
    const app = await getApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'wrongpassword' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
  });

  it('returns 429 on the 6th attempt with wrong password from same IP (rate limit)', async () => {
    const app = await getApp();

    // Send 6 requests with wrong password
    const requests = Array.from({ length: 6 }, () =>
      request(app)
        .post('/api/auth/login')
        .send({ password: 'wrongpassword' })
        .set('Content-Type', 'application/json')
        .set('X-Forwarded-For', '192.168.99.99') // Same IP for all
    );

    const results = [];
    for (const req of requests) {
      results.push(await req);
    }

    // First 5 should be 401, 6th should be 429
    const statuses = results.map((r) => r.status);
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});

describe('GET /api/auth/check', () => {
  it('returns 401 with { authenticated: false } when no session', async () => {
    const app = await getApp();
    const res = await request(app).get('/api/auth/check');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ authenticated: false });
  });

  it('returns 200 with { authenticated: true } after successful login', async () => {
    const app = await getApp();
    const agent = request.agent(app); // agent persists cookies

    await agent
      .post('/api/auth/login')
      .send({ password: 'testpass' })
      .set('Content-Type', 'application/json');

    const res = await agent.get('/api/auth/check');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ authenticated: true });
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200 with { ok: true } and destroys session', async () => {
    const app = await getApp();
    const agent = request.agent(app);

    // Login first
    await agent
      .post('/api/auth/login')
      .send({ password: 'testpass' })
      .set('Content-Type', 'application/json');

    // Verify authenticated
    const checkBefore = await agent.get('/api/auth/check');
    expect(checkBefore.status).toBe(200);

    // Logout
    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);
    expect(logout.body).toEqual({ ok: true });

    // Verify session destroyed
    const checkAfter = await agent.get('/api/auth/check');
    expect(checkAfter.status).toBe(401);
  });
});
