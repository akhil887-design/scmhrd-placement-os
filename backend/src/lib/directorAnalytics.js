import {
  placementReadiness,
  psychPercentFromTraitTotals,
} from './scoring.js';
import { computeCompanyReadiness } from './companyReadinessMapping.js';
import {
  classifyStudentRisk,
  classifyCohortStudents,
  sortRiskClassificationRows,
} from './riskClassification.js';

const TRACKS = ['Marketing', 'HR', 'Finance', 'BA', 'IDM'];

function round1(v) {
  if (v == null || Number.isNaN(v)) return null;
  return Math.round(Number(v) * 10) / 10;
}

/** Map DB track + free-text specialization → canonical track bucket. */
export function mapTrack(trackColumn, specialization) {
  const t = (trackColumn || '').trim();
  if (TRACKS.includes(t)) return t;
  const s = (specialization || '').toLowerCase();
  if (s.includes('market')) return 'Marketing';
  if (s.includes('hr') || s.includes('human resource')) return 'HR';
  if (s.includes('finance')) return 'Finance';
  if (s.includes('business analytic') || /\bba\b/.test(s) || s.endsWith(' ba')) return 'BA';
  if (s.includes('idm') || s.includes('information digital')) return 'IDM';
  return 'Other';
}

export function strengthSummary(m) {
  const a = m.aptitude_percent;
  const i = m.interview_percent;
  const p = m.psych_fit_percent;
  const max = Math.max(a, i, p);
  const parts = [];
  if (a >= max - 3) parts.push('Aptitude');
  if (i >= max - 3) parts.push('Interview');
  if (p >= max - 3) parts.push('Psych');
  return parts.length ? parts.join(', ') : 'Balanced';
}

/**
 * Single pass: all student metrics (batched SQL + O(n) merge).
 */
export function batchStudentMetrics(db) {
  const students = db
    .prepare(
      `SELECT u.id, u.name, u.email, p.specialization, p.track
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.role = 'student'`
    )
    .all();

  const aptRows = db
    .prepare(
      `SELECT user_id, category, MAX(CAST(score AS REAL) / NULLIF(total, 0)) AS r
       FROM aptitude_attempts
       WHERE status = 'submitted' AND total > 0
       GROUP BY user_id, category`
    )
    .all();

  const aptByUser = {};
  for (const row of aptRows) {
    if (!aptByUser[row.user_id]) {
      aptByUser[row.user_id] = { Quant: null, Logical: null, Verbal: null };
    }
    aptByUser[row.user_id][row.category] = Number(row.r) * 100;
  }

  function aptitudePercent(uid) {
    const c = aptByUser[uid];
    if (!c) return 0;
    const parts = ['Quant', 'Logical', 'Verbal'].map((cat) => c[cat]).filter((v) => v != null);
    if (!parts.length) return 0;
    return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  }

  function quantPercent(uid) {
    const r = aptByUser[uid]?.Quant;
    return r != null ? Math.round(r) : 0;
  }

  const intRows = db
    .prepare(
      `SELECT user_id, AVG(confidence) AS avg_c, COUNT(*) AS n
       FROM interview_user_state
       WHERE confidence IS NOT NULL
       GROUP BY user_id`
    )
    .all();

  const intByUser = {};
  for (const row of intRows) {
    if (!row.n) continue;
    intByUser[row.user_id] = Math.round(((Number(row.avg_c) - 1) / 4) * 100);
  }

  const psychRows = db
    .prepare(
      `SELECT pa.user_id, pa.trait_totals
       FROM psych_attempts pa
       INNER JOIN (
         SELECT user_id, MAX(id) AS mid FROM psych_attempts GROUP BY user_id
       ) t ON pa.id = t.mid`
    )
    .all();

  const psychByUser = {};
  for (const row of psychRows) {
    try {
      const tt = JSON.parse(row.trait_totals);
      psychByUser[row.user_id] = psychPercentFromTraitTotals(tt);
    } catch {
      psychByUser[row.user_id] = 0;
    }
  }

  return students.map((s) => {
    const apt = aptitudePercent(s.id);
    const intv = intByUser[s.id] ?? 0;
    const psych = psychByUser[s.id] ?? 0;
    const readiness = placementReadiness(apt, intv, psych);
    const track = mapTrack(s.track, s.specialization);
    return {
      user_id: s.id,
      name: s.name,
      email: s.email,
      specialization: s.specialization || '',
      track,
      aptitude_percent: apt,
      interview_percent: intv,
      psych_fit_percent: psych,
      quant_percent: quantPercent(s.id),
      placement_readiness: readiness,
    };
  });
}

export function buildBatchOverview(metrics, eligibleThreshold = 60) {
  const total = metrics.length;
  const eligible = metrics.filter((m) => m.placement_readiness >= eligibleThreshold).length;
  const high = metrics.filter((m) => m.placement_readiness > 80).length;
  const mod = metrics.filter((m) => m.placement_readiness >= 60 && m.placement_readiness <= 80).length;
  const risk = metrics.filter((m) => m.placement_readiness < 60).length;
  return {
    total_students: total,
    eligible_students: eligible,
    readiness_distribution: {
      high_ready_gt_80: high,
      moderate_60_to_80: mod,
      at_risk_lt_60: risk,
    },
  };
}

export function specializationBreakdown(metrics) {
  const buckets = {};
  for (const t of [...TRACKS, 'Other']) {
    buckets[t] = {
      track: t,
      count: 0,
      sum_apt: 0,
      sum_int: 0,
      sum_psych: 0,
      sum_readiness: 0,
    };
  }
  for (const m of metrics) {
    const key = TRACKS.includes(m.track) ? m.track : 'Other';
    const b = buckets[key];
    b.count += 1;
    b.sum_apt += m.aptitude_percent;
    b.sum_int += m.interview_percent;
    b.sum_psych += m.psych_fit_percent;
    b.sum_readiness += m.placement_readiness;
  }
  return [...TRACKS, 'Other'].map((t) => {
    const b = buckets[t];
    const n = b.count || 1;
    return {
      track: t,
      student_count: b.count,
      avg_aptitude: b.count ? Math.round((b.sum_apt / n) * 10) / 10 : 0,
      avg_interview: b.count ? Math.round((b.sum_int / n) * 10) / 10 : 0,
      avg_psych: b.count ? Math.round((b.sum_psych / n) * 10) / 10 : 0,
      avg_placement_readiness: b.count ? Math.round((b.sum_readiness / n) * 10) / 10 : 0,
    };
  });
}

export function atRiskStudents(metrics) {
  return metrics
    .filter((m) => m.placement_readiness < 60)
    .map((m) => {
      const { risk_tags, recommendations } = classifyStudentRisk(m);
      return {
        user_id: m.user_id,
        name: m.name,
        placement_readiness: m.placement_readiness,
        risk_tags,
        recommendations,
      };
    })
    .sort((a, b) => a.placement_readiness - b.placement_readiness);
}

/** Full cohort: risk tags + action line per student (sorted: more flags, then lower final). */
export function studentRiskClassification(metrics) {
  return sortRiskClassificationRows(classifyCohortStudents(metrics));
}

export function topPerformers(metrics, n = 10) {
  const sorted = [...metrics].sort(
    (a, b) =>
      b.placement_readiness - a.placement_readiness ||
      b.aptitude_percent - a.aptitude_percent ||
      b.interview_percent - a.interview_percent
  );
  return sorted.slice(0, n).map((m) => ({
    user_id: m.user_id,
    name: m.name,
    placement_readiness: m.placement_readiness,
    strengths: strengthSummary(m),
  }));
}

export function companyReadiness(metrics) {
  return computeCompanyReadiness(metrics);
}

/** Weekly cohort trend: avg aptitude attempt % and avg psych fit by calendar week. */
export function weeklyTrend(db) {
  const aptWeeks = db
    .prepare(
      `SELECT strftime('%Y-%W', submitted_at) AS wk,
              AVG(CAST(score AS REAL) / NULLIF(total, 0)) * 100 AS avg_apt
       FROM aptitude_attempts
       WHERE status = 'submitted' AND total > 0
         AND datetime(submitted_at) >= datetime('now', '-84 days')
       GROUP BY wk
       ORDER BY wk`
    )
    .all();

  const psychRows = db
    .prepare(
      `SELECT strftime('%Y-%W', submitted_at) AS wk, trait_totals
       FROM psych_attempts
       WHERE datetime(submitted_at) >= datetime('now', '-84 days')`
    )
    .all();

  const psychAgg = {};
  for (const row of psychRows) {
    if (!row.wk) continue;
    let fit = 0;
    try {
      fit = psychPercentFromTraitTotals(JSON.parse(row.trait_totals));
    } catch {
      continue;
    }
    if (!psychAgg[row.wk]) psychAgg[row.wk] = { sum: 0, n: 0 };
    psychAgg[row.wk].sum += fit;
    psychAgg[row.wk].n += 1;
  }

  const weeks = new Set([...aptWeeks.map((r) => r.wk), ...Object.keys(psychAgg)]);
  return [...weeks]
    .sort()
    .map((wk) => ({
      week: wk,
      label: wk,
      avg_aptitude_attempt_pct: round1(aptWeeks.find((r) => r.wk === wk)?.avg_apt ?? null),
      avg_psych_fit: psychAgg[wk] ? round1(psychAgg[wk].sum / psychAgg[wk].n) : null,
    }));
}

export function interventionEngine(metrics) {
  const n = metrics.length || 1;
  const avgQuant =
    metrics.reduce((a, m) => a + m.quant_percent, 0) / n;
  const avgInterview =
    metrics.reduce((a, m) => a + m.interview_percent, 0) / n;
  const avgApt = metrics.reduce((a, m) => a + m.aptitude_percent, 0) / n;

  const recs = [];
  if (avgQuant < 60) recs.push('Run Quant Bootcamp (cohort Quant avg < 60%).');
  if (avgApt < 60) recs.push('Schedule structured aptitude drills across Quant, Logical, Verbal.');
  if (avgInterview < 50) recs.push('Mock PI sessions needed (cohort interview avg < 50%).');
  if (recs.length === 0) recs.push('Cohort metrics are within range; sustain practice cadence.');
  return { recommendations: recs, cohort_avg: { quant: round1(avgQuant), aptitude: round1(avgApt), interview: round1(avgInterview) } };
}
