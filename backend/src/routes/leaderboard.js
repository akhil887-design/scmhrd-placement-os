import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import {
  aptitudePercentForUser,
  interviewPercentForUser,
  psychPercentForUser,
  placementReadiness,
} from '../lib/scoring.js';

const router = Router();
router.use(authRequired);

router.get('/', (req, res) => {
  const users = db.prepare(`SELECT id, name, email FROM users WHERE role = 'student'`).all();
  const rows = users.map((u) => {
    const apt = aptitudePercentForUser(db, u.id);
    const intv = interviewPercentForUser(db, u.id);
    const psych = psychPercentForUser(db, u.id);
    const final = placementReadiness(apt, intv, psych);
    return {
      user_id: u.id,
      name: u.name,
      email: u.email,
      aptitude_percent: apt,
      interview_percent: intv,
      psych_fit_percent: psych,
      final_score: final,
    };
  });
  rows.sort(
    (a, b) =>
      b.final_score - a.final_score ||
      b.aptitude_percent - a.aptitude_percent ||
      b.interview_percent - a.interview_percent ||
      a.name.localeCompare(b.name)
  );
  const ranked = rows.map((r, i) => ({ rank: i + 1, ...r }));
  res.json({ leaderboard: ranked });
});

export default router;
