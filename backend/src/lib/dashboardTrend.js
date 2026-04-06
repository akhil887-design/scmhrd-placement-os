import { psychPercentFromTraitTotals } from './scoring.js';

/**
 * Build a forward-filled time series for dashboard line chart:
 * each row = snapshot after an aptitude submit or psych submit.
 * Interview % is carried as a flat reference (current aggregate).
 */
export function buildPerformanceTrend(db, userId, interviewPercent) {
  const aptRows = db
    .prepare(
      `SELECT submitted_at, score, total FROM aptitude_attempts
       WHERE user_id = ? AND status = 'submitted' AND total > 0
       ORDER BY datetime(submitted_at) ASC`
    )
    .all(userId);

  const psychRows = db
    .prepare(
      `SELECT submitted_at, trait_totals FROM psych_attempts
       WHERE user_id = ? ORDER BY datetime(submitted_at) ASC`
    )
    .all(userId);

  const events = [];
  for (const a of aptRows) {
    const pct = Math.round((Number(a.score) / Number(a.total)) * 1000) / 10;
    events.push({ t: a.submitted_at, kind: 'aptitude', value: pct });
  }
  for (const p of psychRows) {
    let tt;
    try {
      tt = JSON.parse(p.trait_totals);
    } catch {
      continue;
    }
    const pct = psychPercentFromTraitTotals(tt);
    events.push({ t: p.submitted_at, kind: 'psych', value: pct });
  }

  events.sort((a, b) => new Date(a.t) - new Date(b.t));

  let lastA = null;
  let lastP = null;
  const series = [];
  for (const e of events) {
    if (e.kind === 'aptitude') lastA = e.value;
    if (e.kind === 'psych') lastP = e.value;
    series.push({
      at: e.t,
      aptitude: lastA,
      psych: lastP,
      interview: interviewPercent,
    });
  }

  return {
    series,
    has_data: series.length > 0,
  };
}
