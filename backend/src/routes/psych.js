import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { psychPercentFromTraitTotals } from '../lib/scoring.js';
import {
  aggregateRawTotals,
  normalizeToPercentages,
  buildInterpretationSummary,
  buildInterpretationNarrative,
  toPublicTraitPercentages,
  scoresForOption,
} from '../lib/psychEngine.js';

const router = Router();
router.use(authRequired);

const getQuestionStmt = db.prepare(`SELECT id, trait_weights FROM psych_questions WHERE id = ?`);

router.get('/questions', (_req, res) => {
  const rows = db
    .prepare(`SELECT id, prompt, options FROM psych_questions ORDER BY id`)
    .all();
  const questions = rows.map((r) => ({
    id: r.id,
    prompt: r.prompt,
    options: JSON.parse(r.options),
  }));
  res.json({ questions });
});

router.post('/submit', (req, res) => {
  const { answers } = req.body || {};
  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: 'answers[] required' });
  }

  const normalized = [];
  for (const a of answers) {
    const qid = a.question_id ?? a.questionId;
    const opt = a.option_index ?? a.optionIndex;
    if (qid == null || opt == null) continue;
    const q = getQuestionStmt.get(qid);
    if (!q) continue;
    if (!scoresForOption(q.trait_weights, opt)) continue;
    normalized.push({ question_id: qid, option_index: Number(opt) });
  }

  const totals = aggregateRawTotals(normalized, (qid) => getQuestionStmt.get(qid));
  const traitTotalsJson = JSON.stringify(totals);
  const percentages = normalizeToPercentages(totals);
  const percentagesJson = JSON.stringify(percentages);
  const interpretationSummary = buildInterpretationSummary(percentages);
  const interpretationFull = buildInterpretationNarrative(percentages);
  const psychFit = psychPercentFromTraitTotals(totals);

  const insertAttempt = db.prepare(
    `INSERT INTO psych_attempts (user_id, trait_totals, trait_percentages, interpretation_summary)
     VALUES (?,?,?,?)`
  );
  const insertR = db.prepare(
    `INSERT INTO psych_responses (attempt_id, question_id, option_index) VALUES (?,?,?)`
  );

  const attemptId = db.transaction(() => {
    const info = insertAttempt.run(
      req.user.id,
      traitTotalsJson,
      percentagesJson,
      interpretationSummary
    );
    const id = info.lastInsertRowid;
    for (const row of normalized) {
      insertR.run(id, row.question_id, row.option_index);
    }
    return id;
  })();

  res.json({
    attempt_id: attemptId,
    trait_totals: totals,
    trait_percentages: percentages,
    trait_percentages_public: toPublicTraitPercentages(percentages),
    psych_fit_percent: psychFit,
    interpretation_summary: interpretationSummary,
    interpretation: interpretationFull,
  });
});

router.get('/latest', (req, res) => {
  const row = db
    .prepare(
      `SELECT id, trait_totals, trait_percentages, interpretation_summary, submitted_at
       FROM psych_attempts WHERE user_id = ? ORDER BY id DESC LIMIT 1`
    )
    .get(req.user.id);
  if (!row) return res.json({ attempt: null });

  let totals;
  try {
    totals = JSON.parse(row.trait_totals);
  } catch {
    totals = {};
  }

  let percentages;
  try {
    percentages = row.trait_percentages ? JSON.parse(row.trait_percentages) : null;
  } catch {
    percentages = null;
  }
  if (!percentages) {
    percentages = normalizeToPercentages(totals);
  }

  const interpretationSummary =
    row.interpretation_summary || buildInterpretationSummary(percentages);

  res.json({
    attempt: {
      id: row.id,
      trait_totals: totals,
      trait_percentages: percentages,
      trait_percentages_public: toPublicTraitPercentages(percentages),
      psych_fit_percent: psychPercentFromTraitTotals(totals),
      submitted_at: row.submitted_at,
      interpretation_summary: interpretationSummary,
      interpretation: buildInterpretationNarrative(percentages),
    },
  });
});

export default router;
