/**
 * Rule-based risk tags and paired action recommendations per student.
 * Multiple rules can apply; order is stable (high → quant → communication → behavioral).
 */

const RULES = [
  {
    tag: 'High Risk',
    test: (m) => Number(m.placement_readiness) < 60,
    action: 'Low final score → Placement readiness intervention plan',
  },
  {
    tag: 'Quant Risk',
    test: (m) => Number(m.aptitude_percent) < 50,
    action: 'Low Aptitude → Assign Quant Practice Set',
  },
  {
    tag: 'Communication Risk',
    test: (m) => Number(m.interview_percent) < 50,
    action: 'Low Interview → Mock PI sessions',
  },
  {
    tag: 'Behavioral Risk',
    test: (m) => Number(m.psych_fit_percent) < 50,
    action: 'Low Psych → Behavioral assessment workshop',
  },
];

/**
 * @param {{ placement_readiness: number, aptitude_percent: number, interview_percent: number, psych_fit_percent: number }} m
 */
export function classifyStudentRisk(m) {
  const risk_tags = [];
  const recommendations = [];
  for (const rule of RULES) {
    if (rule.test(m)) {
      risk_tags.push(rule.tag);
      recommendations.push(rule.action);
    }
  }
  return { risk_tags, recommendations };
}

/** Sort: more flags first, then lower final score. */
export function sortRiskClassificationRows(rows) {
  return [...rows].sort((a, b) => {
    const da = b.risk_tags.length - a.risk_tags.length;
    if (da !== 0) return da;
    return (a.final_score ?? 0) - (b.final_score ?? 0);
  });
}

/**
 * @param {Array<{ user_id: number, name: string, email: string, aptitude_percent: number, interview_percent: number, psych_fit_percent: number, placement_readiness: number }>} metrics
 */
export function classifyCohortStudents(metrics) {
  return metrics.map((m) => {
    const { risk_tags, recommendations } = classifyStudentRisk(m);
    return {
      user_id: m.user_id,
      name: m.name,
      email: m.email,
      final_score: m.placement_readiness,
      aptitude_percent: m.aptitude_percent,
      interview_percent: m.interview_percent,
      psych_fit_percent: m.psych_fit_percent,
      risk_tags,
      recommendations,
    };
  });
}
