import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import connectPg from 'connect-pg-simple';

// Augment express-session to include authenticated flag
declare module 'express-session' {
  interface SessionData {
    authenticated: boolean;
  }
}

const PGStore = connectPg(session);

const app = express();
const PORT = process.env.PORT || 5001;

// Required: Render sits behind a reverse proxy
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Cross-origin support (Vercel frontend + Render backend)
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true, // Required: enables Set-Cookie cross-origin
}));

// Body parsing
app.use(express.json());

// Session with Postgres store (sessions survive Render restarts)
app.use(session({
  store: new PGStore({
    conString: process.env.SUPABASE_DB_URL,
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  rolling: true,          // Reset maxAge on activity (recommended ASVS)
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'lax',      // NOT 'strict' — cross-origin POST requires lax
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}));

// Health check (no auth required)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Start server only when run directly (not imported in tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app };
