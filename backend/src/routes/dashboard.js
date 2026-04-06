import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import {
  aptitudePercentForUser,
  interviewPercentForUser,
  psychPercentForUser,
  placementReadiness,
} from '../lib/scoring.js';
import { normalizeToPercentages, toPublicTraitPercentages } from '../lib/psychEngine.js';
import { readinessRecommendations } from '../lib/recommendations.js';
import { buildPerformanceTrend } from '../lib/dashboardTrend.js';

const router = Router();
router.use(authRequired);

router.get('/', (req, res) => {
  const uid = req.user.id;
  const aptitude = aptitudePercentForUser(db, uid);
  const interview = interviewPercentForUser(db, uid);
  const psych = psychPercentForUser(db, uid);
  const overall = placementReadiness(aptitude, interview, psych);

  const lastMock = db
    .prepare(
      `SELECT consistency_score, created_at FROM mock_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1`
    )
    .get(uid);

  const latestPsych = db
    .prepare(
      `SELECT trait_totals, trait_percentages FROM psych_attempts WHERE user_id = ? ORDER BY id DESC LIMIT 1`
    )
    .get(uid);

  let trait_percentages_public = null;
  if (latestPsych) {
    try {
      let pct;
      if (latestPsych.trait_percentages) {
        pct = JSON.parse(latestPsych.trait_percentages);
      } else {
        pct = normalizeToPercentages(JSON.parse(latestPsych.trait_totals));
      }
      trait_percentages_public = toPublicTraitPercentages(pct);
    } catch {
      trait_percentages_public = null;
    }
  }

  const trend = buildPerformanceTrend(db, uid, interview);

  res.json({
    placement_readiness: overall,
    breakdown: {
      aptitude_percent: aptitude,
      interview_percent: interview,
      psych_fit_percent: psych,
    },
    weights: { aptitude: 0.4, interview: 0.3, psych: 0.3 },
    trait_percentages_public,
    trend,
    recommendations: readinessRecommendations(aptitude, interview),
    last_mock_session: lastMock || null,
  });
});

export default router;
