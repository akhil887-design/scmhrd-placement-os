import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { mockConsistencyScore } from '../lib/scoring.js';

const router = Router();
router.use(authRequired);

function normalizeMode(m) {
  if (!m || typeof m !== 'string') return null;
  const u = m.trim();
  if (u === 'HR' || u.toLowerCase() === 'hr') return 'HR';
  if (u === 'Technical' || u.toLowerCase() === 'technical') return 'Technical';
  if (u === 'Case' || u.toLowerCase() === 'case') return 'Case';
  return null;
}

router.post('/start', (req, res) => {
  const { count = 8, mode, seconds_per_question: spq } = req.body || {};
  const category = normalizeMode(mode);
  if (!category) {
    return res.status(400).json({ error: 'mode required: HR, Technical, or Case' });
  }
  let perQ = Number(spq);
  if (!Number.isFinite(perQ)) perQ = 90;
  perQ = Math.round(perQ);
  if (perQ < 60 || perQ > 120) {
    return res.status(400).json({ error: 'seconds_per_question must be between 60 and 120' });
  }

  const n = Math.min(20, Math.max(3, Number(count) || 8));
  const rows = db
    .prepare(
      `SELECT id, category, question FROM interview_questions WHERE category = ? ORDER BY RANDOM() LIMIT ?`
    )
    .all(category, n);
  if (!rows.length) return res.status(404).json({ error: 'No questions in bank for this mode' });

  const info = db
    .prepare(
      `INSERT INTO mock_sessions (user_id, question_count, mode, seconds_per_question) VALUES (?,?,?,?)`
    )
    .run(req.user.id, rows.length, category, perQ);
  const sessionId = info.lastInsertRowid;

  res.status(201).json({
    session_id: sessionId,
    mode: category,
    seconds_per_question: perQ,
    questions: rows,
  });
});

router.post('/submit', (req, res) => {
  const { session_id, responses } = req.body || {};
  if (!session_id || !Array.isArray(responses)) {
    return res.status(400).json({ error: 'session_id and responses[] required' });
  }
  const sess = db
    .prepare(`SELECT * FROM mock_sessions WHERE id = ? AND user_id = ?`)
    .get(session_id, req.user.id);
  if (!sess) return res.status(404).json({ error: 'Session not found' });

  const insert = db.prepare(
    `INSERT INTO mock_responses (session_id, question_id, confidence, seconds_used) VALUES (?,?,?,?)`
  );
  const confidences = [];
  const run = db.transaction(() => {
    for (const r of responses) {
      const qid = r.question_id ?? r.questionId;
      const conf = r.confidence;
      const sec = r.seconds_used ?? r.secondsUsed;
      if (qid == null || conf == null) continue;
      const c = Number(conf);
      if (c < 1 || c > 5) continue;
      const su =
        sec != null && Number.isFinite(Number(sec))
          ? Math.max(0, Math.round(Number(sec)))
          : null;
      insert.run(session_id, qid, c, su);
      confidences.push(c);
    }
  });
  run();

  const consistency = mockConsistencyScore(confidences);
  db.prepare(
    `UPDATE mock_sessions SET consistency_score = ?, completed_at = datetime('now') WHERE id = ?`
  ).run(consistency, session_id);

  const prev = db
    .prepare(
      `SELECT id, consistency_score FROM mock_sessions
       WHERE user_id = ? AND id < ? AND completed_at IS NOT NULL
       ORDER BY id DESC LIMIT 1`
    )
    .get(req.user.id, session_id);

  const improvement =
    prev && typeof prev.consistency_score === 'number'
      ? Math.round((consistency - prev.consistency_score) * 10) / 10
      : null;

  res.json({
    session_id,
    consistency_score: consistency,
    responses_recorded: confidences.length,
    improvement_vs_previous: improvement,
    previous_consistency: prev?.consistency_score ?? null,
  });
});

router.get('/sessions', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, created_at, completed_at, consistency_score, question_count, mode, seconds_per_question
       FROM mock_sessions
       WHERE user_id = ? AND completed_at IS NOT NULL
       ORDER BY id DESC
       LIMIT 40`
    )
    .all(req.user.id);

  const enriched = rows.map((r, i) => {
    const older = rows[i + 1];
    const delta =
      older && typeof older.consistency_score === 'number'
        ? Math.round((r.consistency_score - older.consistency_score) * 10) / 10
        : null;
    return {
      ...r,
      delta_consistency: delta,
    };
  });

  res.json({ sessions: enriched });
});

router.get('/sessions/:id', (req, res) => {
  const sess = db
    .prepare(
      `SELECT id, created_at, completed_at, consistency_score, question_count, mode, seconds_per_question, user_id
       FROM mock_sessions WHERE id = ?`
    )
    .get(req.params.id);
  if (!sess || sess.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Not found' });
  }
  const responses = db
    .prepare(
      `SELECT r.question_id, r.confidence, r.seconds_used, q.category, q.question
       FROM mock_responses r
       JOIN interview_questions q ON q.id = r.question_id
       WHERE r.session_id = ?
       ORDER BY r.id`
    )
    .all(req.params.id);
  res.json({ session: sess, responses });
});

export default router;
