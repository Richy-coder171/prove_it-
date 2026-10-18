import { Router } from 'express';
import { Submission } from '../models.js';
import { asyncHandler } from '../util.js';
import { isPubliclyValidBadge } from '../badge-state.js';

const router = Router();

router.get('/:badgeId', asyncHandler(async (req, res) => {
  const submission = await Submission.findOne({ badgeId: req.params.badgeId }).lean();
  const badge = submission?.badge;
  if (!badge) return res.status(404).json({ error: 'Badge not found' });
  // Revoked or below-threshold credentials are not public credentials. Keep a
  // 200/verified:false response for tamper detection, preserving the existing
  // verification contract for otherwise valid badge records.
  if (!isPubliclyValidBadge(submission) && submission.badgeStatus === 'revoked') {
    return res.status(404).json({ error: 'Badge not found' });
  }
  res.json({
    badgeId: badge.badgeId,
    verified: isPubliclyValidBadge(submission),
    name: badge.name,
    skill: badge.skill,
    level: badge.level,
    total: badge.total,
    issuedAt: badge.issuedAt,
    authenticity: badge.authenticity ?? null,
    mentor: badge.mentor ?? null,
    challengeTitle: badge.challengeTitle,
    breakdownPublic: Boolean(submission.badgeBreakdownPublic),
    criteria: submission.badgeBreakdownPublic
      ? (badge.criteria || []).map(({ name, weight, points, why }) => ({ name, weight, points, why }))
      : [],
  });
}));

export default router;
