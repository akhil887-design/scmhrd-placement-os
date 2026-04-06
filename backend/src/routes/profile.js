import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', (req, res) => {
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.id);
  let resumeData = {};
  try {
    resumeData = profile?.resume_data ? JSON.parse(profile.resume_data) : {};
  } catch {
    resumeData = {};
  }
  res.json({
    user,
    profile: {
      specialization: profile?.specialization ?? '',
      skills: profile?.skills ?? '',
      cgpa: profile?.cgpa ?? null,
      resume_template: profile?.resume_template ?? 'classic',
      resume_data: resumeData,
    },
  });
});

router.put('/', (req, res) => {
  const {
    specialization,
    skills,
    cgpa,
    resume_template,
    resume_data,
  } = req.body || {};
  const existing = db.prepare('SELECT user_id FROM profiles WHERE user_id = ?').get(req.user.id);
  const resumeJson =
    resume_data !== undefined ? JSON.stringify(resume_data ?? {}) : undefined;
  if (!existing) {
    db.prepare(
      `INSERT INTO profiles (user_id, specialization, skills, cgpa, resume_template, resume_data, updated_at)
       VALUES (?,?,?,?,?,?,datetime('now'))`
    ).run(
      req.user.id,
      specialization ?? '',
      skills ?? '',
      cgpa ?? null,
      resume_template ?? 'classic',
      resumeJson ?? '{}'
    );
  } else {
    const u = db.prepare(
      `UPDATE profiles SET
        specialization = COALESCE(?, specialization),
        skills = COALESCE(?, skills),
        cgpa = COALESCE(?, cgpa),
        resume_template = COALESCE(?, resume_template),
        resume_data = COALESCE(?, resume_data),
        updated_at = datetime('now')
       WHERE user_id = ?`
    );
    u.run(
      specialization ?? null,
      skills ?? null,
      cgpa !== undefined ? cgpa : null,
      resume_template ?? null,
      resumeJson ?? null,
      req.user.id
    );
  }
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
  let rd = {};
  try {
    rd = profile?.resume_data ? JSON.parse(profile.resume_data) : {};
  } catch {
    rd = {};
  }
  res.json({
    profile: {
      specialization: profile.specialization,
      skills: profile.skills,
      cgpa: profile.cgpa,
      resume_template: profile.resume_template,
      resume_data: rd,
    },
  });
});

router.get('/test-scores', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, label, score, max_score, taken_at FROM test_scores WHERE user_id = ? ORDER BY taken_at DESC`
    )
    .all(req.user.id);
  res.json({ scores: rows });
});

router.post('/test-scores', (req, res) => {
  const { label, score, max_score } = req.body || {};
  if (!label || score === undefined) {
    return res.status(400).json({ error: 'label and score required' });
  }
  const max = max_score != null ? Number(max_score) : 100;
  const info = db
    .prepare(
      `INSERT INTO test_scores (user_id, label, score, max_score) VALUES (?,?,?,?)`
    )
    .run(req.user.id, String(label), Number(score), max);
  res.status(201).json({
    score: {
      id: info.lastInsertRowid,
      label,
      score: Number(score),
      max_score: max,
    },
  });
});

router.delete('/test-scores/:id', (req, res) => {
  const r = db
    .prepare('DELETE FROM test_scores WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;
