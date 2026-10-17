import { Router } from 'express';
import { Challenge, Submission } from '../models.js';
import { requireOwner } from '../middleware.js';
import { asyncHandler } from '../util.js';
import { generateChallenge } from '../graders.js';

const router = Router();
const challengeView = (challenge) => {
  const value = challenge.toObject();
  value.id = String(value._id);
  delete value._id;
  delete value.__v;
  return value;
};
const weightsTotal = (rubric) => rubric.reduce((sum, criterion) => sum + Number(criterion.weight), 0);

router.post('/generate', asyncHandler(async (req, res) => {
  const { mode, text, posterName = '' } = req.body || {};
  if (!['job', 'idea'].includes(mode)) return res.status(400).json({ error: 'Mode must be job or idea' });
  if (typeof text !== 'string' || text.trim().length < 30) return res.status(400).json({ error: 'Please provide at least 30 characters of source text' });
  if (typeof posterName !== 'string') return res.status(400).json({ error: 'Poster name must be text' });
  let draft;
  try {
    draft = await generateChallenge({ mode, text: text.trim() });
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Could not generate a challenge' });
  }
  const challenge = await Challenge.create({ mode, posterName: posterName.trim(), sourceText: text.trim(), ...draft, status: 'draft' });
  res.status(201).json({ challenge: challengeView(challenge), ownerKey: challenge.ownerKey });
}));

router.get('/:id/owner', requireOwner, (req, res) => res.json(challengeView(req.challenge)));

router.put('/:id', requireOwner, asyncHandler(async (req, res) => {
  const challenge = req.challenge;
  if (challenge.status !== 'draft') return res.status(409).json({ error: 'Only draft challenges can be edited' });
  const { title, task, timeLimitMin, rubric, seedQuestions } = req.body || {};
  if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'Challenge title is required' });
  if (typeof task !== 'string' || !task.trim()) return res.status(400).json({ error: 'Challenge task is required' });
  if (!Number.isInteger(Number(timeLimitMin)) || Number(timeLimitMin) < 15 || Number(timeLimitMin) > 60) return res.status(400).json({ error: 'Time limit must be between 15 and 60 minutes' });
  if (!Array.isArray(rubric) || !rubric.length || rubric.some((item) => !String(item.name || '').trim() || !String(item.description || '').trim() || !Number.isFinite(Number(item.weight)) || Number(item.weight) < 0)) {
    return res.status(400).json({ error: 'Rubric criteria need a name, description, and valid weight' });
  }
  if (weightsTotal(rubric) !== 100) return res.status(400).json({ error: 'Rubric weights must add up to exactly 100' });
  if (!Array.isArray(seedQuestions) || seedQuestions.some((item) => typeof item !== 'string')) return res.status(400).json({ error: 'Starting questions must be text values' });
  challenge.title = title.trim();
  challenge.task = task.trim();
  challenge.timeLimitMin = Number(timeLimitMin);
  challenge.rubric = rubric.map(({ name, weight, description }) => ({ name: name.trim(), weight: Number(weight), description: description.trim() }));
  challenge.seedQuestions = seedQuestions.map((question) => question.trim()).filter(Boolean);
  await challenge.save();
  res.json(challengeView(challenge));
}));

router.post('/:id/approve', requireOwner, asyncHandler(async (req, res) => {
  const challenge = req.challenge;
  if (challenge.status !== 'draft') return res.status(409).json({ error: 'Challenge is already published' });
  if (!challenge.title?.trim() || !challenge.task?.trim() || !challenge.rubric?.length || weightsTotal(challenge.rubric) !== 100) {
    return res.status(400).json({ error: 'Add a title, task, and rubric weights totaling 100 before publishing' });
  }
  challenge.status = 'live';
  await challenge.save();
  res.json(challengeView(challenge));
}));

router.get('/:id/leaderboard', requireOwner, asyncHandler(async (req, res) => {
  const submissions = await Submission.find({ challengeId: req.challenge._id }).sort({ createdAt: 1 }).lean();
  submissions.sort((a, b) => (b.score?.total || 0) - (a.score?.total || 0));
  res.json(submissions.map((row) => ({
    id: String(row._id), name: row.name, email: row.email,
    total: row.score?.total ?? 0,
    reasoning: row.score?.reasoning ?? 0,
    reasoningMax: row.score?.reasoningMax ?? 0,
    authenticity: row.score?.authenticity?.level ?? null,
    flagged: Boolean(row.score?.flagged),
    shortlisted: Boolean(row.shortlisted),
    rereviewRequested: Boolean(row.rereviewRequested),
    mentor: row.mentor?.name ? { name: row.mentor.name, note: row.mentor.note } : null,
    badgeId: row.badgeId || null,
  })));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id).catch(() => null);
  if (!challenge || challenge.status !== 'live') return res.status(404).json({ error: 'Challenge not found or not published' });
  res.json({
    id: String(challenge._id), mode: challenge.mode, title: challenge.title,
    skill: challenge.skill, level: challenge.level, timeLimitMin: challenge.timeLimitMin,
    task: challenge.task,
    rubric: challenge.rubric.map(({ name, weight, description }) => ({ name, weight, description })),
    status: challenge.status,
  });
}));

router.post('/:id/start', asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id).catch(() => null);
  if (!challenge || challenge.status !== 'live') return res.status(404).json({ error: 'Challenge not found or not published' });
  const { name, email, retry = false } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ error: 'A valid email is required' });
  if (typeof retry !== 'boolean') return res.status(400).json({ error: 'Retry must be a boolean' });
  const normalizedEmail = email.trim().toLowerCase();
  if (!retry) {
    const existing = await Submission.findOne({ challengeId: challenge._id, email: normalizedEmail }).sort({ createdAt: -1 });
    if (existing) return res.json(submissionView(existing));
  }
  const startedAt = new Date();
  const submission = await Submission.create({
    challengeId: challenge._id, name: name.trim(), email: normalizedEmail,
    startedAt, deadline: new Date(startedAt.getTime() + challenge.timeLimitMin * 60_000), status: 'started',
  });
  res.status(201).json(submissionView(submission));
}));

export function submissionView(submission) {
  const value = submission.toObject ? submission.toObject() : { ...submission };
  value.id = String(value._id || value.id);
  value.challengeId = String(value.challengeId?._id || value.challengeId);
  delete value._id;
  delete value.__v;
  return value;
}

export default router;
