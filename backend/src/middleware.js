import { Challenge, Submission } from './models.js';
import { asyncHandler } from './util.js';

// Loads req.challenge from :id (404 if missing or bad id).
export const loadChallenge = asyncHandler(async (req, res, next) => {
  const ch = await Challenge.findById(req.params.id).catch(() => null);
  if (!ch) return res.status(404).json({ error: 'Challenge not found' });
  req.challenge = ch;
  next();
});

// Loads req.submission from :id and its req.challenge.
export const loadSubmission = asyncHandler(async (req, res, next) => {
  const sub = await Submission.findById(req.params.id).catch(() => null);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });
  req.submission = sub;
  req.challenge = await Challenge.findById(sub.challengeId);
  if (!req.challenge) return res.status(404).json({ error: 'Challenge not found' });
  next();
});

// The poster proves ownership with the header  x-owner-key: <ownerKey>
const checkOwner = (req, res, next) => {
  if (req.get('x-owner-key') !== req.challenge.ownerKey) return res.status(403).json({ error: 'Owner key required' });
  next();
};

export const requireOwner = [loadChallenge, checkOwner]; // routes where :id is a challenge id
export const requireOwnerOfSubmission = [loadSubmission, checkOwner]; // routes where :id is a submission id
