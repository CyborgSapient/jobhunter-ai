import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './db.js';
import { clerkMiddleware } from './middleware/auth.js';

// Route modules
import webhookRouter from './routes/webhooks.js';
import usersRouter from './routes/users.js';
import resumesRouter from './routes/resumes.js';
import subscriptionsRouter from './routes/subscriptions.js';
import missionsRouter from './routes/missions.js';
import adminRouter from './routes/admin.js';
import aiRouter from './routes/ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

/* ────────────────────────────────────────────
   Global middleware
   ──────────────────────────────────────────── */

// CORS — allow Vite dev server
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'],
  credentials: true,
}));

// Webhook route MUST be mounted BEFORE express.json()
// because svix needs the raw body for signature verification
app.use('/api/webhooks', webhookRouter);

// Parse JSON bodies (16MB limit for resume data)
app.use(express.json({ limit: '16mb' }));

/* ────────────────────────────────────────────
   Routes
   ──────────────────────────────────────────── */

app.use('/api/users', clerkMiddleware(), usersRouter);
app.use('/api/resumes', clerkMiddleware(), resumesRouter);
app.use('/api/subscriptions', clerkMiddleware(), subscriptionsRouter);
app.use('/api/missions', clerkMiddleware(), missionsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ai', clerkMiddleware(), aiRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

/* ────────────────────────────────────────────
   Error handling
   ──────────────────────────────────────────── */

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  if (err.status === 401 || err.message?.includes('Unauthenticated')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

/* ────────────────────────────────────────────
   Start — connect MongoDB first, then listen
   ──────────────────────────────────────────── */

await connectDB();

app.listen(PORT, () => {
  console.log(`\n  ⚡ JobHunter.AI Backend`);
  console.log(`  ➜ Local:   http://localhost:${PORT}`);
  console.log(`  ➜ Health:  http://localhost:${PORT}/api/health`);
  console.log(`  ➜ Routes:  /api/users, /api/resumes, /api/subscriptions, /api/missions, /api/ai`);
  console.log(`  ➜ Webhook: /api/webhooks/clerk\n`);
});
