import { Router } from 'express';
import { db } from '../db.js';
import { authRequired, directorAccess } from '../middleware/auth.js';
import {
  batchStudentMetrics,
  buildBatchOverview,
  specializationBreakdown,
  atRiskStudents,
  studentRiskClassification,
  topPerformers,
  companyReadiness,
  weeklyTrend,
  interventionEngine,
} from '../lib/directorAnalytics.js';
const router = Router();
router.use(authRequired, directorAccess);

function csvEscape(s) {
  const t = String(s ?? '');
  if (t.includes('"') || t.includes(',') || t.includes('\n')) {
    return `"${t.replace(/"/g, '""')}"`;
  }
  return t;
}

function csvRows(headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','));
  }
  return lines.join('\n');
}

router.get('/analytics', (_req, res) => {
  const metrics = batchStudentMetrics(db);
  const overview = buildBatchOverview(metrics);
  const bySpec = specializationBreakdown(metrics);
  const atRisk = atRiskStudents(metrics);
  const riskClassification = studentRiskClassification(metrics);
  const top = topPerformers(metrics, 10);
  const companies = companyReadiness(metrics);
  const trend = weeklyTrend(db);
  const interventions = interventionEngine(metrics);

  res.json({
    generated_at: new Date().toISOString(),
    batch_overview: overview,
    specialization_analysis: bySpec,
    at_risk: atRisk,
    risk_classification: riskClassification,
    top_performers: top,
    company_readiness: companies,
    weekly_trend: trend,
    intervention_engine: interventions,
  });
});

router.get('/export', (req, res) => {
  const type = (req.query.type || 'scores').toLowerCase();
  const metrics = batchStudentMetrics(db);

  if (type === 'scores') {
    const headers = [
      'user_id',
      'name',
      'email',
      'track',
      'specialization',
      'aptitude_pct',
      'interview_pct',
      'psych_pct',
      'placement_readiness',
    ];
    const rows = metrics.map((m) => [
      m.user_id,
      m.name,
      m.email,
      m.track,
      m.specialization,
      m.aptitude_percent,
      m.interview_percent,
      m.psych_fit_percent,
      m.placement_readiness,
    ]);
    const body = csvRows(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="student_scores.csv"');
    return res.send('\uFEFF' + body);
  }

  if (type === 'rankings') {
    const sorted = [...metrics].sort(
      (a, b) =>
        b.placement_readiness - a.placement_readiness ||
        b.aptitude_percent - a.aptitude_percent ||
        b.interview_percent - a.interview_percent
    );
    const headers = ['rank', 'name', 'email', 'aptitude_pct', 'interview_pct', 'psych_pct', 'final_score'];
    const rows = sorted.map((m, i) => [
      i + 1,
      m.name,
      m.email,
      m.aptitude_percent,
      m.interview_percent,
      m.psych_fit_percent,
      m.placement_readiness,
    ]);
    const body = csvRows(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rankings.csv"');
    return res.send('\uFEFF' + body);
  }

  if (type === 'risk') {
    const risk = atRiskStudents(metrics);
    const headers = ['name', 'placement_readiness', 'risk_tags', 'recommendations'];
    const rows = risk.map((r) => [
      r.name,
      r.placement_readiness,
      (r.risk_tags || []).join('; '),
      (r.recommendations || []).join(' | '),
    ]);
    const body = csvRows(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="at_risk_students.csv"');
    return res.send('\uFEFF' + body);
  }

  if (type === 'risk_classification') {
    const rows = studentRiskClassification(metrics);
    const headers = [
      'user_id',
      'name',
      'email',
      'final_score',
      'aptitude_pct',
      'interview_pct',
      'psych_pct',
      'risk_tags',
      'recommendations',
    ];
    const body = csvRows(
      headers,
      rows.map((r) => [
        r.user_id,
        r.name,
        r.email,
        r.final_score,
        r.aptitude_percent,
        r.interview_percent,
        r.psych_fit_percent,
        (r.risk_tags || []).join('; '),
        (r.recommendations || []).join(' | '),
      ])
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="risk_classification.csv"');
    return res.send('\uFEFF' + body);
  }

  res.status(400).json({ error: 'type must be scores, rankings, risk, or risk_classification' });
});

export default router;
