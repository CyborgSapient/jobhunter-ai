import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './db.js';
import { clerkMiddleware } from './middleware/auth.js';

import webhookRouter from './routes/webhooks.js';
import usersRouter from './routes/users.js';
import resumesRouter from './routes/resumes.js';
import subscriptionsRouter from './routes/subscriptions.js';
import missionsRouter from './routes/missions.js';
import adminRouter from './routes/admin.js';
import aiRouter from './routes/ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    'https://jobhunter-ai-git-master-cyborgsapients-projects.vercel.app',
    'https://jobhunter-ai-two.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));

app.use('/api/webhooks', webhookRouter);
app.use(express.json({ limit: '16mb' }));

app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api/users', clerkMiddleware(), usersRouter);
app.use('/api/resumes', clerkMiddleware(), resumesRouter);
app.use('/api/subscriptions', clerkMiddleware(), subscriptionsRouter);
app.use('/api/missions', clerkMiddleware(), missionsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ai', clerkMiddleware(), aiRouter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

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

if (process.env.VERCEL !== '1') {
  await connectDB();

  app.listen(PORT, () => {
    console.log('\n  JobHunter.AI Backend');
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Health:  http://localhost:${PORT}/api/health`);
    console.log('  Routes:  /api/users, /api/resumes, /api/subscriptions, /api/missions, /api/ai');
    console.log('  Webhook: /api/webhooks/clerk\n');
  });
}

export default app;
