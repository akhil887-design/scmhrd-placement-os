/**
 * Static company expectations: minimum aptitude % and interview % to be considered "ready".
 */

export const COMPANY_READINESS_DATASET = [
  { company: 'Accenture', aptitude: 70, interview: 65 },
  { company: 'Deloitte', aptitude: 75, interview: 70 },
  { company: 'TCS', aptitude: 65, interview: 60 },
];

/**
 * @param {{ aptitude_percent: number, interview_percent: number }} student
 * @param {{ aptitude: number, interview: number }} rule
 */
export function isStudentEligible(student, rule) {
  return (
    student.aptitude_percent >= rule.aptitude && student.interview_percent >= rule.interview
  );
}

/**
 * For each company rule, count students meeting both thresholds and compute % of cohort.
 * @param {Array<{ aptitude_percent: number, interview_percent: number }>} metrics
 */
export function computeCompanyReadiness(metrics) {
  const total = metrics.length;
  if (total === 0) {
    return COMPANY_READINESS_DATASET.map((rule) => ({
      company: rule.company,
      aptitude_threshold: rule.aptitude,
      interview_threshold: rule.interview,
      students_eligible: 0,
      total_students: 0,
      percent_eligible: 0,
    }));
  }

  return COMPANY_READINESS_DATASET.map((rule) => {
    const eligible = metrics.filter((m) => isStudentEligible(m, rule)).length;
    const percent = Math.round((eligible / total) * 1000) / 10;
    return {
      company: rule.company,
      aptitude_threshold: rule.aptitude,
      interview_threshold: rule.interview,
      students_eligible: eligible,
      total_students: total,
      percent_eligible: percent,
    };
  });
}
