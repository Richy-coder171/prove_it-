import { Router } from 'express';
import { Submission, User } from '../models.js';
import { asyncHandler } from '../util.js';
import { isPubliclyValidBadge } from '../badge-state.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const parsedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(100, parsedLimit)) : 50;
  const submissions = await Submission.find({
    status: 'graded',
    badgeId: { $type: 'string', $ne: '' },
    userId: { $exists: true, $ne: null },
  }).lean();
  const userIds = [...new Set(submissions.map((submission) => String(submission.userId)))];
  const users = userIds.length ? await User.find({ _id: { $in: userIds }, showOnLeaderboard: true }).select('name headline college').lean() : [];
  const userById = new Map(users.map((user) => [String(user._id), user]));
  const bestByUserSkill = new Map();

  for (const submission of submissions) {
    const userId = String(submission.userId);
    const user = userById.get(userId);
    if (!user || !isPubliclyValidBadge(submission)) continue;
    const badge = submission.badge;
    const skill = badge.skill || '';
    const key = `${userId}\u0000${skill}`;
    const candidate = {
      userId,
      name: user.name,
      headline: user.headline || '',
      college: user.college || '',
      skill,
      level: badge.level || null,
      total: Number(submission.score?.total ?? badge.total ?? 0),
      authenticity: submission.score?.authenticity?.level || badge.authenticity || null,
      badgeId: submission.badgeId,
      mentor: badge.mentor?.name || submission.mentor?.name || null,
      issuedAt: badge.issuedAt || null,
    };
    const previous = bestByUserSkill.get(key);
    if (!previous || candidate.total > previous.total) bestByUserSkill.set(key, candidate);
  }

  const allRows = [...bestByUserSkill.values()];
  const skills = [...new Set(allRows.map((row) => row.skill).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  const rows = allRows
    .filter((row) => !req.query.skill || row.skill === req.query.skill)
    .sort((left, right) => right.total - left.total || new Date(left.issuedAt || 0) - new Date(right.issuedAt || 0))
    .slice(0, limit)
    .map((row, index) => ({ rank: index + 1, ...row }));
  res.json({ skills, rows });
}));

export default router;
