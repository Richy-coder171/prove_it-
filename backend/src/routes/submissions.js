import { Router } from 'express';
import crypto from 'crypto';
import { Submission } from '../models.js';
import { requireCandidate, requireOwnerOfSubmission } from '../middleware.js';
import { asyncHandler, signBadge } from '../util.js';
import { generateFollowups, generateSkillGaps, gradeSubmission } from '../graders.js';
import { submissionView } from './challenges.js';

const router = Router();
const totalOf = (criteria = []) => Math.round(criteria.reduce((sum, item) => sum + Number(item.points || 0), 0));
const badgeId = () => `PI-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

router.get('/:id/owner', requireOwnerOfSubmission, (req, res) => res.json(submissionView(req.submission)));

router.post('/:id/shortlist', requireOwnerOfSubmission, asyncHandler(async (req, res) => {
  req.submission.shortlisted = !req.submission.shortlisted;
  await req.submission.save();
  res.json(submissionView(req.submission));
}));

router.post('/:id/override', requireOwnerOfSubmission, asyncHandler(async (req, res) => {
  const { criterion, points, note = '' } = req.body || {};
  if (req.submission.status !== 'graded' || !req.submission.score?.criteria) return res.status(409).json({ error: 'Only graded submissions can be adjusted' });
  const item = req.submission.score.criteria.find((row) => row.name === criterion);
  const value = Number(points);
  if (!item) return res.status(404).json({ error: 'Scoring criterion not found' });
  if (!Number.isFinite(value) || value < 0 || value > Number(item.weight)) return res.status(400).json({ error: `Points must be between 0 and ${item.weight}` });
  item.aiPoints ??= item.points;
  item.points = Math.round(value * 100) / 100;
  item.percent = item.weight ? Math.round(item.points / item.weight * 10000) / 100 : 0;
  item.overridden = true;
  item.overrideNote = String(note).trim();
  req.submission.score.total = totalOf(req.submission.score.criteria);
  const reasoning = req.submission.score.criteria.find((row) => /reason|analysis|problem.?solv/i.test(row.name));
  req.submission.score.reasoning = reasoning?.points || 0;
  req.submission.markModified('score');
  if (req.submission.badge) {
    req.submission.badge.total = req.submission.score.total;
    req.submission.badge.criteria = req.submission.score.criteria.map(({ name, weight, points, why }) => ({ name, weight, points, why }));
    req.submission.badge.signature = signBadge(req.submission.badge);
    req.submission.markModified('badge');
  }
  await req.submission.save();
  res.json(submissionView(req.submission));
}));

router.post('/:id/answer', requireCandidate, asyncHandler(async (req, res) => {
  if (req.submission.status === 'expired') return res.status(410).json({ error: 'This attempt has expired. Start a new attempt to try again.', expired: true });
  const answer = req.body?.answer;
  if (req.submission.status !== 'started') return res.status(409).json({ error: 'This attempt has already been submitted' });
  if (typeof answer !== 'string' || answer.trim().length < 20) return res.status(400).json({ error: 'Please provide an answer of at least 20 characters' });
  if (!req.submission.deadline || Date.now() > new Date(req.submission.deadline).getTime()) {
    req.submission.status = 'expired';
    req.submission.late = true;
    await req.submission.save();
    return res.status(410).json({ error: 'This attempt expired before your answer was submitted. Start a new attempt to try again.', expired: true });
  }
  req.submission.answer = answer.trim();
  req.submission.late = false;
  req.submission.questions = await generateFollowups(req.challenge, req.submission.answer);
  req.submission.qa = req.submission.questions.map((q) => ({ q, a: '' }));
  req.submission.status = 'answered';
  await req.submission.save();
  res.json(submissionView(req.submission));
}));

router.post('/:id/defend', requireCandidate, asyncHandler(async (req, res) => {
  if (req.submission.status !== 'answered') return res.status(409).json({ error: 'Submit your solution before defending it' });
  const answers = req.body?.answers;
  if (!Array.isArray(req.submission.questions) || ![2, 3].includes(req.submission.questions.length)
    || !Array.isArray(answers) || answers.length !== req.submission.questions.length
    || answers.some((answer) => typeof answer !== 'string' || answer.trim().length < 20 || new Set(answer.trim().toLowerCase().match(/[a-z0-9]+/g) || []).size < 4)) {
    return res.status(400).json({ error: 'Answers must match the follow-up questions and each answer must contain at least 20 meaningful characters' });
  }
  req.submission.qa = req.submission.questions.map((q, index) => ({ q, a: answers[index].trim() }));
  req.submission.score = await gradeSubmission(req.challenge, req.submission.answer, req.submission.qa);
  req.submission.status = 'graded';
  if (req.submission.score.total >= 70) {
    const badge = {
      badgeId: badgeId(), name: req.submission.name, skill: req.challenge.skill,
      level: req.submission.score.total >= 85 ? 'Advanced' : 'Intermediate', total: req.submission.score.total, issuedAt: new Date().toISOString(),
      authenticity: req.submission.score.authenticity?.level || null,
      mentor: req.submission.mentor?.name ? { name: req.submission.mentor.name, note: req.submission.mentor.note || '' } : null,
      challengeTitle: req.challenge.title,
      criteria: req.submission.score.criteria.map(({ name, weight, points, why }) => ({ name, weight, points, why })),
    };
    badge.signature = signBadge(badge);
    req.submission.badge = badge;
    req.submission.badgeId = badge.badgeId;
  }
  await req.submission.save();
  res.json(submissionView(req.submission));
}));

router.get('/:id', requireCandidate, (req, res) => res.json(submissionView(req.submission)));

router.post('/:id/rereview', requireCandidate, asyncHandler(async (req, res) => {
  if (req.submission.status !== 'graded') return res.status(409).json({ error: 'Only a graded result can be reviewed' });
  req.submission.rereviewRequested = true;
  await req.submission.save();
  res.json(submissionView(req.submission));
}));

router.post('/:id/skill-gap', requireCandidate, asyncHandler(async (req, res) => {
  if (req.submission.status !== 'graded' || !req.submission.score) return res.status(409).json({ error: 'The attempt must be graded first' });
  res.json(await generateSkillGaps(req.submission.score));
}));

router.post('/:id/badge-visibility', requireCandidate, asyncHandler(async (req, res) => {
  if (!req.submission.badgeId || !req.submission.badge) return res.status(409).json({ error: 'This attempt has no verified badge' });
  if (typeof req.body?.public !== 'boolean') return res.status(400).json({ error: 'public must be a boolean' });
  req.submission.badgeBreakdownPublic = req.body.public;
  await req.submission.save();
  res.json({ public: req.submission.badgeBreakdownPublic });
}));

router.post('/:id/mentor', requireOwnerOfSubmission, asyncHandler(async (req, res) => {
  const { mentorName, note } = req.body || {};
  if (req.submission.status !== 'graded') return res.status(409).json({ error: 'Only graded submissions can receive an endorsement' });
  if (typeof mentorName !== 'string' || !mentorName.trim() || typeof note !== 'string' || !note.trim()) return res.status(400).json({ error: 'Mentor name and note are required' });
  req.submission.mentor = { name: mentorName.trim(), note: note.trim(), at: new Date() };
  if (req.submission.badge) {
    req.submission.badge.mentor = { name: mentorName.trim(), note: note.trim() };
    req.submission.badge.signature = signBadge(req.submission.badge);
    req.submission.markModified('badge');
  }
  await req.submission.save();
  res.json(submissionView(req.submission));
}));

export default router;
