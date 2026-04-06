/**
 * Deterministic psychological assessment engine (no ML).
 * 40 MCQs; each option maps four traits to integer scores in [1, 5].
 * Raw scores are summed per trait, then normalized to percentages that sum to 100%.
 */

export const TRAIT_KEYS = [
  'analytical',
  'leadership',
  'risk_taking',
  'emotional_stability',
];

/** Display order / labels for interpretation sentence */
export const TRAIT_LABELS = {
  analytical: 'Analytical',
  leadership: 'Leadership',
  risk_taking: 'Risk',
  emotional_stability: 'Emotional Stability',
};

/**
 * Clamp a single trait contribution to {1..5}.
 */
export function clampTraitScore(v) {
  const n = Math.round(Number(v));
  if (Number.isNaN(n)) return 1;
  return Math.max(1, Math.min(5, n));
}

/**
 * Parse option weights object for one MCQ option index.
 * Expected shape: trait_weights["0"] = { analytical, leadership, risk_taking, emotional_stability }
 */
export function scoresForOption(traitWeightsJson, optionIndex) {
  let w;
  try {
    w = typeof traitWeightsJson === 'string' ? JSON.parse(traitWeightsJson) : traitWeightsJson;
  } catch {
    return null;
  }
  const block = w[String(optionIndex)] ?? w[Number(optionIndex)];
  if (!block || typeof block !== 'object') return null;
  const out = {};
  for (const t of TRAIT_KEYS) {
    out[t] = clampTraitScore(block[t]);
  }
  return out;
}

/**
 * Sum trait scores across answered items (deterministic).
 */
export function aggregateRawTotals(answerRows, getQuestion) {
  const totals = Object.fromEntries(TRAIT_KEYS.map((t) => [t, 0]));
  for (const a of answerRows) {
    const q = getQuestion(a.question_id ?? a.questionId);
    if (!q) continue;
    const opt = a.option_index ?? a.optionIndex;
    if (opt == null) continue;
    const s = scoresForOption(q.trait_weights, opt);
    if (!s) continue;
    for (const t of TRAIT_KEYS) {
      totals[t] += s[t];
    }
  }
  return totals;
}

/**
 * Normalize raw totals to four percentages that sum to 100% (one decimal).
 */
export function normalizeToPercentages(totals) {
  const sum = TRAIT_KEYS.reduce((acc, t) => acc + (Number(totals[t]) || 0), 0);
  const pct = {};
  if (sum <= 0) {
    for (const t of TRAIT_KEYS) pct[t] = 0;
    return pct;
  }
  for (const t of TRAIT_KEYS) {
    pct[t] = Math.round((((Number(totals[t]) || 0) / sum) * 100) * 10) / 10;
  }
  const drift = 100 - TRAIT_KEYS.reduce((a, k) => a + pct[k], 0);
  if (Math.abs(drift) >= 0.01) {
    const last = TRAIT_KEYS[TRAIT_KEYS.length - 1];
    pct[last] = Math.round((pct[last] + drift) * 10) / 10;
  }
  return pct;
}

/** Deterministic band from percentage share (four-way split, ~25% each). */
export function bandForPercentage(pct) {
  if (pct >= 30) return 'High';
  if (pct <= 20) return 'Low';
  return 'Moderate';
}

/**
 * One-line summary, e.g. "High Analytical, Moderate Leadership, Low Risk-taking, Moderate Emotional Stability"
 * Order: Analytical → Leadership → Risk → Emotional Stability
 */
export function buildInterpretationSummary(percentages) {
  const order = [
    ['analytical', 'Analytical'],
    ['leadership', 'Leadership'],
    ['risk_taking', 'Risk'],
    ['emotional_stability', 'Emotional Stability'],
  ];
  return order
    .map(([key, label]) => {
      const p = percentages[key] ?? 0;
      return `${bandForPercentage(p)} ${label}`;
    })
    .join(', ');
}

/**
 * Longer narrative (deterministic, template-based).
 */
export function buildInterpretationNarrative(percentages) {
  const sorted = [...TRAIT_KEYS].sort(
    (a, b) => (percentages[b] ?? 0) - (percentages[a] ?? 0)
  );
  const top = sorted[0];
  const lines = [
    `Strongest relative dimension: ${TRAIT_LABELS[top]} (${percentages[top]}%).`,
  ];
  for (const t of TRAIT_KEYS) {
    const p = percentages[t] ?? 0;
    if (bandForPercentage(p) === 'High') {
      lines.push(
        `High ${TRAIT_LABELS[t]} suggests you lean toward ${hintForTrait(t)} in workplace scenarios.`
      );
    }
  }
  lines.push(
    'Use this profile to align prep: emphasize stories and drills that match target roles, and consciously develop gaps where bands are Low.'
  );
  return lines.join('\n\n');
}

function hintForTrait(t) {
  const hints = {
    analytical: 'structured analysis, frameworks, and evidence-first decisions',
    leadership: 'ownership, stakeholder alignment, and driving outcomes',
    risk_taking: 'action under ambiguity and calculated bets',
    emotional_stability: 'steady judgment and composure under pressure',
  };
  return hints[t] || 'this dimension';
}

/**
 * API-friendly percentages (alias risk_taking → risk for clients).
 */
export function toPublicTraitPercentages(percentages) {
  return {
    analytical: percentages.analytical ?? 0,
    leadership: percentages.leadership ?? 0,
    risk: percentages.risk_taking ?? 0,
    emotional_stability: percentages.emotional_stability ?? 0,
  };
}

/**
 * Validate trait_weights JSON for a 4-option MCQ: each option 0..3 has four scores in 1..5.
 */
export function validateTraitWeights(traitWeights) {
  let w;
  try {
    w = typeof traitWeights === 'string' ? JSON.parse(traitWeights) : traitWeights;
  } catch {
    return { ok: false, error: 'Invalid trait_weights JSON' };
  }
  if (!w || typeof w !== 'object') return { ok: false, error: 'Invalid trait_weights' };
  for (let i = 0; i < 4; i++) {
    const block = w[String(i)] ?? w[i];
    if (!block || typeof block !== 'object') {
      return { ok: false, error: `Missing weights for option ${i}` };
    }
    for (const t of TRAIT_KEYS) {
      const v = Number(block[t]);
      if (!Number.isInteger(v) || v < 1 || v > 5) {
        return {
          ok: false,
          error: `Option ${i}, trait ${t}: must be integer 1–5`,
        };
      }
    }
  }
  return { ok: true };
}
