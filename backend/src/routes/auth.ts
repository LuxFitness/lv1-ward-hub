import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { loginRateLimiter, loginSlowDown } from '../middleware/rateLimiter';

export const authRouter = Router();

// POST /api/auth/login
// Rate-limited: loginSlowDown (progressive delay) then loginRateLimiter (hard cap at 5/15min/IP)
// Session fixation prevention (T-05-02): regenerate() issues new session ID on login
authRouter.post('/login', loginSlowDown, loginRateLimiter, async (req, res) => {
  const { password } = req.body as { password?: string };
  const hash = process.env.APP_PASSWORD_HASH;

  if (!hash || !password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Session regeneration prevents session fixation (T-05-02)
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ error: 'Session error' });
    }
    req.session.authenticated = true;
    req.session.save((saveErr) => {
      if (saveErr) {
        return res.status(500).json({ error: 'Session save error' });
      }
      res.json({ ok: true });
    });
  });
});

// GET /api/auth/check
// No auth middleware — this IS the auth check endpoint
authRouter.get('/check', (req, res) => {
  if (req.session?.authenticated === true) {
    return res.json({ authenticated: true });
  }
  res.status(401).json({ authenticated: false });
});

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});
