import { Router } from 'express';
import { Submission } from '../models.js';
import { asyncHandler, verifyBadge } from '../util.js';

const router = Router();

router.get('/:badgeId', asyncHandler(async (req, res) => {
  const submission = await Submission.findOne({ badgeId: req.params.badgeId }).lean();
  const badge = submission?.badge;
  if (!badge) return res.status(404).json({ error: 'Badge not found' });
  res.json({
    badgeId: badge.badgeId,
    verified: verifyBadge(badge),
    name: badge.name,
    skill: badge.skill,
    level: badge.level,
    total: badge.total,
    issuedAt: badge.issuedAt,
    authenticity: badge.authenticity ?? null,
    mentor: badge.mentor ?? null,
    challengeTitle: badge.challengeTitle,
    criteria: (badge.criteria || []).map(({ name, weight, points, why }) => ({ name, weight, points, why })),
  });
}));

export default router;
