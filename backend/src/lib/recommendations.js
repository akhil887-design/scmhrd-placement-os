/**
 * Rule-based readiness recommendations (deterministic, no ML).
 */

export function readinessRecommendations(aptitudePercent, interviewPercent) {
  const out = [];
  if (aptitudePercent < 60) {
    out.push('Focus on Quant practice');
  }
  if (interviewPercent < 50) {
    out.push('Improve communication');
  }
  if (out.length === 0) {
    out.push('Maintain momentum across aptitude, interview, and psych.');
  }
  return out;
}
