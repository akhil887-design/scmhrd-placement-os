import { Router } from 'express';
import { db } from '../db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import {
  aptitudePercentForUser,
  interviewPercentForUser,
  psychPercentForUser,
  placementReadiness,
} from '../lib/scoring.js';
import { validateTraitWeights } from '../lib/psychEngine.js';

const router = Router();
router.use(authRequired, adminOnly);

/** --- Aptitude questions --- */
router.get('/aptitude', (_req, res) => {
  const rows = db
    .prepare(`SELECT id, category, question, options, correct_index, solution FROM aptitude_questions ORDER BY category, id`)
    .all();
  res.json({
    questions: rows.map((r) => ({
      ...r,
      options: JSON.parse(r.options),
    })),
  });
});

router.post('/aptitude', (req, res) => {
  const { category, question, options, correct_index, solution } = req.body || {};
  if (!category || !question || !options || correct_index == null) {
    return res.status(400).json({ error: 'category, question, options[], correct_index required' });
  }
  if (!['Quant', 'Logical', 'Verbal'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  const opts = Array.isArray(options) ? options : JSON.parse(String(options));
  const info = db
    .prepare(
      `INSERT INTO aptitude_questions (category, question, options, correct_index, solution)
       VALUES (?,?,?,?,?)`
    )
    .run(category, question, JSON.stringify(opts), Number(correct_index), solution ?? '');
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/aptitude/:id', (req, res) => {
  const { category, question, options, correct_index, solution } = req.body || {};
  const existing = db.prepare(`SELECT id FROM aptitude_questions WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const opts =
    options !== undefined
      ? JSON.stringify(Array.isArray(options) ? options : JSON.parse(String(options)))
      : db.prepare(`SELECT options FROM aptitude_questions WHERE id = ?`).get(req.params.id).options;
  db.prepare(
    `UPDATE aptitude_questions SET
      category = COALESCE(?, category),
      question = COALESCE(?, question),
      options = COALESCE(?, options),
      correct_index = COALESCE(?, correct_index),
      solution = COALESCE(?, solution)
     WHERE id = ?`
  ).run(
    category ?? null,
    question ?? null,
    options !== undefined ? opts : null,
    correct_index !== undefined ? Number(correct_index) : null,
    solution ?? null,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/aptitude/:id', (req, res) => {
  const r = db.prepare(`DELETE FROM aptitude_questions WHERE id = ?`).run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

/** --- Psych questions --- */
router.get('/psych', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM psych_questions ORDER BY id`).all();
  res.json({
    questions: rows.map((r) => ({
      id: r.id,
      prompt: r.prompt,
      options: JSON.parse(r.options),
      trait_weights: JSON.parse(r.trait_weights),
    })),
  });
});

router.post('/psych', (req, res) => {
  const { prompt, options, trait_weights } = req.body || {};
  if (!prompt || !options || !trait_weights) {
    return res.status(400).json({ error: 'prompt, options[], trait_weights required' });
  }
  try {
    const v = validateTraitWeights(trait_weights);
    if (!v.ok) return res.status(400).json({ error: v.error });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid trait_weights JSON' });
  }
  const info = db
    .prepare(`INSERT INTO psych_questions (prompt, options, trait_weights) VALUES (?,?,?)`)
    .run(prompt, JSON.stringify(options), JSON.stringify(trait_weights));
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/psych/:id', (req, res) => {
  const { prompt, options, trait_weights } = req.body || {};
  const row = db.prepare(`SELECT id FROM psych_questions WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (trait_weights !== undefined) {
    try {
      const v = validateTraitWeights(trait_weights);
      if (!v.ok) return res.status(400).json({ error: v.error });
    } catch {
      return res.status(400).json({ error: 'Invalid trait_weights JSON' });
    }
  }
  db.prepare(
    `UPDATE psych_questions SET
      prompt = COALESCE(?, prompt),
      options = COALESCE(?, options),
      trait_weights = COALESCE(?, trait_weights)
     WHERE id = ?`
  ).run(
    prompt ?? null,
    options !== undefined ? JSON.stringify(options) : null,
    trait_weights !== undefined ? JSON.stringify(trait_weights) : null,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/psych/:id', (req, res) => {
  const r = db.prepare(`DELETE FROM psych_questions WHERE id = ?`).run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

/** --- Interview questions --- */
router.get('/interview', (req, res) => {
  const category = req.query.category;
  let where = '';
  const params = [];
  if (category && ['HR', 'Technical', 'Case'].includes(category)) {
    where = 'WHERE category = ?';
    params.push(category);
  }
  const rows = db
    .prepare(`SELECT id, category, question, answer FROM interview_questions ${where} ORDER BY id`)
    .all(...params);
  res.json({ questions: rows });
});

router.post('/interview', (req, res) => {
  const { category, question, answer } = req.body || {};
  if (!category || !question || !answer) {
    return res.status(400).json({ error: 'category, question, answer required' });
  }
  if (!['HR', 'Technical', 'Case'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  const info = db
    .prepare(
      `INSERT INTO interview_questions (category, question, answer) VALUES (?,?,?)`
    )
    .run(category, question, answer);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/interview/:id', (req, res) => {
  const { category, question, answer } = req.body || {};
  const row = db.prepare(`SELECT id FROM interview_questions WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare(
    `UPDATE interview_questions SET
      category = COALESCE(?, category),
      question = COALESCE(?, question),
      answer = COALESCE(?, answer)
     WHERE id = ?`
  ).run(category ?? null, question ?? null, answer ?? null, req.params.id);
  res.json({ ok: true });
});

router.delete('/interview/:id', (req, res) => {
  const r = db.prepare(`DELETE FROM interview_questions WHERE id = ?`).run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

/** --- Student performance --- */
router.get('/students', (_req, res) => {
  const students = db.prepare(`SELECT id, name, email, created_at FROM users WHERE role = 'student'`).all();
  const out = students.map((u) => {
    const apt = aptitudePercentForUser(db, u.id);
    const intv = interviewPercentForUser(db, u.id);
    const psych = psychPercentForUser(db, u.id);
    const final = placementReadiness(apt, intv, psych);
    const attempts = db
      .prepare(`SELECT COUNT(*) AS c FROM aptitude_attempts WHERE user_id = ? AND status = 'submitted'`)
      .get(u.id).c;
    const psychN = db.prepare(`SELECT COUNT(*) AS c FROM psych_attempts WHERE user_id = ?`).get(u.id).c;
    return {
      ...u,
      aptitude_percent: apt,
      interview_percent: intv,
      psych_fit_percent: psych,
      placement_readiness: final,
      aptitude_attempts: attempts,
      psych_attempts: psychN,
    };
  });
  out.sort((a, b) => b.placement_readiness - a.placement_readiness);
  res.json({ students: out });
});

export default router;
