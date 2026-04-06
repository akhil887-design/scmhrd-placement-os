/**
 * Placement readiness components (0–100).
 */

const TRAITS = ['analytical', 'leadership', 'risk_taking', 'emotional_stability'];

export function aptitudePercentForUser(db, userId) {
  const cats = ['Quant', 'Logical', 'Verbal'];
  const parts = [];
  for (const cat of cats) {
    const row = db
      .prepare(
        `SELECT MAX(CAST(score AS REAL) / NULLIF(total,0)) AS r
         FROM aptitude_attempts
         WHERE user_id = ? AND category = ? AND status = 'submitted' AND total > 0`
      )
      .get(userId, cat);
    if (row?.r != null) parts.push(Number(row.r) * 100);
  }
  if (parts.length === 0) return 0;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

export function interviewPercentForUser(db, userId) {
  const row = db
    .prepare(
      `SELECT AVG(confidence) AS avg_c, COUNT(*) AS n
       FROM interview_user_state
       WHERE user_id = ? AND confidence IS NOT NULL`
    )
    .get(userId);
  if (!row?.n) return 0;
  const avg = Number(row.avg_c);
  return Math.round(((avg - 1) / 4) * 100);
}

export function psychPercentFromTraitTotals(traitTotals) {
  if (!traitTotals || typeof traitTotals !== 'object') return 0;
  const vals = TRAITS.map((t) => Number(traitTotals[t]) || 0);
  const sum = vals.reduce((a, b) => a + b, 0);
  if (sum <= 0) return 0;
  const norm = vals.map((v) => (v / sum) * 100);
  const ideal = 25;
  const dev = norm.reduce((acc, v) => acc + Math.abs(v - ideal), 0) / 4;
  const fit = Math.max(0, 100 - dev * 2);
  return Math.round(fit);
}

export function latestPsychTraitTotals(db, userId) {
  const row = db
    .prepare(
      `SELECT trait_totals FROM psych_attempts WHERE user_id = ? ORDER BY id DESC LIMIT 1`
    )
    .get(userId);
  if (!row?.trait_totals) return null;
  try {
    return JSON.parse(row.trait_totals);
  } catch {
    return null;
  }
}

export function psychPercentForUser(db, userId) {
  const tt = latestPsychTraitTotals(db, userId);
  return psychPercentFromTraitTotals(tt);
}

export function placementReadiness(aptitude, interview, psych) {
  return Math.round(0.4 * aptitude + 0.3 * interview + 0.3 * psych);
}

export function mockConsistencyScore(confidences) {
  if (!confidences?.length) return 0;
  const n = confidences.length;
  const mean = confidences.reduce((a, b) => a + b, 0) / n;
  const variance =
    confidences.reduce((acc, c) => acc + (c - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const score = Math.max(0, Math.min(100, 100 - std * 15));
  return Math.round(score * 10) / 10;
}
