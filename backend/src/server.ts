import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import { authRouter } from './routes/auth';
import { requireAuth } from './middleware/auth';
import { callingsRouter } from './routes/callings';
import { membersRouter } from './routes/members';
import { sacramentRouter } from './routes/sacrament';
import { agendaRouter } from './routes/agenda';
import { calendarRouter } from './routes/calendar';

// Augment express-session to include authenticated flag
declare module 'express-session' {
  interface SessionData {
    authenticated: boolean;
  }
}

const app = express();
const PORT = process.env.PORT || 5001;

// Required: Render sits behind a reverse proxy
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Cross-origin support (Vercel frontend + Render backend)
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'https://lv1-ward-hub.vercel.app',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin requests (no Origin header) and listed origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsing
app.use(express.json());

// In-memory session store — simple and reliable; sessions reset on Render restart
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  rolling: true,          // Reset maxAge on activity (recommended ASVS)
  cookie: {
    secure: process.env.NODE_ENV !== 'test', // Allow non-HTTPS in tests
    httpOnly: true,
    sameSite: process.env.NODE_ENV !== 'test' ? 'none' : 'lax', // 'none' required for cross-origin (Vercel→Render)
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}));

// Auth routes — mounted BEFORE requireAuth (auth endpoints are public)
app.use('/api/auth', authRouter);

// Calling pipeline routes — require auth
app.use('/api/callings', requireAuth, callingsRouter);

// Member roster routes — require auth
app.use('/api/members', requireAuth, membersRouter);

// Sacrament meeting planner — require auth
app.use('/api/sacrament', requireAuth, sacramentRouter);

// Meeting agendas (Bishopric / Ward Council) — require auth
app.use('/api/agenda', requireAuth, agendaRouter);

// Google Calendar proxy — require auth
app.use('/api/calendar', requireAuth, calendarRouter);

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
