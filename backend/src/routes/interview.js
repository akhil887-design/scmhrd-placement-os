import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/questions', (req, res) => {
  const category = req.query.category;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const offset = (page - 1) * pageSize;
  let where = '';
  const params = [];
  if (category && ['HR', 'Technical', 'Case'].includes(category)) {
    where = 'WHERE category = ?';
    params.push(category);
  }
  const totalRow = db.prepare(`SELECT COUNT(*) AS c FROM interview_questions ${where}`).get(...params);
  const rows = db
    .prepare(
      `SELECT id, category, question FROM interview_questions ${where} ORDER BY id LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset);
  res.json({
    questions: rows,
    page,
    pageSize,
    total: totalRow.c,
  });
});

router.get('/questions/:id', (req, res) => {
  const q = db
    .prepare(`SELECT id, category, question, answer FROM interview_questions WHERE id = ?`)
    .get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Not found' });
  const state = db
    .prepare(
      `SELECT revealed, confidence FROM interview_user_state WHERE user_id = ? AND question_id = ?`
    )
    .get(req.user.id, q.id);
  res.json({
    question: { id: q.id, category: q.category, question: q.question },
    answer: state?.revealed ? q.answer : null,
    revealed: !!state?.revealed,
    confidence: state?.confidence ?? null,
  });
});

router.post('/reveal', (req, res) => {
  const { question_id } = req.body || {};
  if (!question_id) return res.status(400).json({ error: 'question_id required' });
  const q = db.prepare(`SELECT id, answer FROM interview_questions WHERE id = ?`).get(question_id);
  if (!q) return res.status(404).json({ error: 'Not found' });
  db.prepare(
    `INSERT INTO interview_user_state (user_id, question_id, revealed, updated_at)
     VALUES (?,?,1,datetime('now'))
     ON CONFLICT(user_id, question_id) DO UPDATE SET revealed = 1, updated_at = datetime('now')`
  ).run(req.user.id, question_id);
  res.json({ answer: q.answer, revealed: true });
});

router.post('/confidence', (req, res) => {
  const { question_id, confidence } = req.body || {};
  if (!question_id || confidence == null) {
    return res.status(400).json({ error: 'question_id and confidence (1-5) required' });
  }
  const c = Number(confidence);
  if (c < 1 || c > 5) return res.status(400).json({ error: 'confidence must be 1-5' });
  db.prepare(
    `INSERT INTO interview_user_state (user_id, question_id, confidence, updated_at)
     VALUES (?,?,?,datetime('now'))
     ON CONFLICT(user_id, question_id) DO UPDATE SET confidence = excluded.confidence, updated_at = datetime('now')`
  ).run(req.user.id, question_id, c);
  res.json({ ok: true });
});

router.get('/stats', (req, res) => {
  const totalQ = db.prepare(`SELECT COUNT(*) AS c FROM interview_questions`).get().c;
  const revealed = db
    .prepare(
      `SELECT COUNT(*) AS c FROM interview_user_state WHERE user_id = ? AND revealed = 1`
    )
    .get(req.user.id).c;
  const rated = db
    .prepare(
      `SELECT COUNT(*) AS c FROM interview_user_state WHERE user_id = ? AND confidence IS NOT NULL`
    )
    .get(req.user.id).c;
  res.json({ total_questions: totalQ, revealed, confidence_rated: rated });
});

export default router;
