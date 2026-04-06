import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/categories', (_req, res) => {
  res.json({ categories: ['Quant', 'Logical', 'Verbal'] });
});

/** Start timed test: all questions for category */
router.post('/start', (req, res) => {
  const { category } = req.body || {};
  if (!['Quant', 'Logical', 'Verbal'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  const qs = db
    .prepare(
      `SELECT id, question, options FROM aptitude_questions WHERE category = ? ORDER BY id`
    )
    .all(category);
  if (!qs.length) return res.status(404).json({ error: 'No questions for category' });
  const info = db
    .prepare(
      `INSERT INTO aptitude_attempts (user_id, category, started_at, total, status)
       VALUES (?,?,datetime('now'),?, 'in_progress')`
    )
    .run(req.user.id, category, qs.length);
  const attemptId = info.lastInsertRowid;
  const questions = qs.map((q) => ({
    id: q.id,
    question: q.question,
    options: JSON.parse(q.options),
  }));
  res.status(201).json({ attempt_id: attemptId, questions, duration_hint_seconds: qs.length * 90 });
});

router.post('/submit', (req, res) => {
  const { attempt_id, answers, duration_seconds } = req.body || {};
  if (!attempt_id || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'attempt_id and answers[] required' });
  }
  const attempt = db
    .prepare(
      `SELECT * FROM aptitude_attempts WHERE id = ? AND user_id = ? AND status = 'in_progress'`
    )
    .get(attempt_id, req.user.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found or already submitted' });

  let correct = 0;
  const insertR = db.prepare(
    `INSERT INTO aptitude_responses (attempt_id, question_id, selected_index) VALUES (?,?,?)`
  );
  const getQ = db.prepare(
    `SELECT id, correct_index, solution, question, options FROM aptitude_questions WHERE id = ?`
  );

  const details = [];
  for (const a of answers) {
    const qid = a.question_id ?? a.questionId;
    const sel = a.selected_index ?? a.selectedIndex;
    if (qid == null || sel == null) continue;
    const q = getQ.get(qid);
    if (!q || q.id !== qid) continue;
    const isCorrect = Number(sel) === Number(q.correct_index);
    if (isCorrect) correct++;
    insertR.run(attempt_id, qid, Number(sel));
    details.push({
      question_id: qid,
      question: q.question,
      options: JSON.parse(q.options),
      selected_index: Number(sel),
      correct_index: q.correct_index,
      correct: isCorrect,
      solution: q.solution,
    });
  }

  const total = attempt.total || details.length;
  db.prepare(
    `UPDATE aptitude_attempts SET status = 'submitted', submitted_at = datetime('now'),
     score = ?, total = ?, duration_seconds = ?
     WHERE id = ?`
  ).run(correct, total, duration_seconds != null ? Number(duration_seconds) : null, attempt_id);

  res.json({
    attempt_id,
    score: correct,
    total,
    percentage: total ? Math.round((correct / total) * 1000) / 10 : 0,
    details,
  });
});

router.get('/attempts', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, category, score, total, status, started_at, submitted_at, duration_seconds
       FROM aptitude_attempts WHERE user_id = ? ORDER BY id DESC LIMIT 50`
    )
    .all(req.user.id);
  res.json({ attempts: rows });
});

router.get('/attempt/:id', (req, res) => {
  const attempt = db
    .prepare(`SELECT * FROM aptitude_attempts WHERE id = ? AND user_id = ?`)
    .get(req.params.id, req.user.id);
  if (!attempt || attempt.status !== 'submitted') {
    return res.status(404).json({ error: 'Not found' });
  }
  const responses = db
    .prepare(
      `SELECT r.question_id, r.selected_index, q.question, q.options, q.correct_index, q.solution
       FROM aptitude_responses r
       JOIN aptitude_questions q ON q.id = r.question_id
       WHERE r.attempt_id = ?`
    )
    .all(req.params.id);
  const details = responses.map((r) => ({
    question_id: r.question_id,
    question: r.question,
    options: JSON.parse(r.options),
    selected_index: r.selected_index,
    correct_index: r.correct_index,
    correct: r.selected_index === r.correct_index,
    solution: r.solution,
  }));
  res.json({ attempt, details });
});

export default router;
