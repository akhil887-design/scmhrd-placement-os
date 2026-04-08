import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import './db.js';

import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import aptitudeRoutes from './routes/aptitude.js';
import psychRoutes from './routes/psych.js';
import interviewRoutes from './routes/interview.js';
import mockInterviewRoutes from './routes/mockInterview.js';
import dashboardRoutes from './routes/dashboard.js';
import leaderboardRoutes from './routes/leaderboard.js';
import adminRoutes from './routes/admin.js';
import directorRoutes from './routes/director.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '../..');

{
  const { runSeed } = await import('./seed.js');
  runSeed();
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'SCMHRD Placement OS API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/aptitude', aptitudeRoutes);
app.use('/api/psych', psychRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/mock-interview', mockInterviewRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/director', directorRoutes);

/** Prefer bundled copy (Render/slug may omit gitignored `frontend/dist`); fallback to monorepo path for local dev. */
const clientDistBundled = path.join(__dirname, '..', 'static');
const clientDistRepo = path.join(root, 'frontend', 'dist');
const clientDist = fs.existsSync(clientDistBundled)
  ? clientDistBundled
  : fs.existsSync(clientDistRepo)
    ? clientDistRepo
    : null;

if (clientDist) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SCMHRD Placement OS API listening on port ${PORT}`);
});
