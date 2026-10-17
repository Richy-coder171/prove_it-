import { Challenge, Submission } from './models.js';
import { asyncHandler, hashSecret, safeEqualHex } from './util.js';

// Loads req.challenge from :id (404 if missing or bad id).
export const loadChallenge = asyncHandler(async (req, res, next) => {
  const ch = await Challenge.findById(req.params.id).select('+ownerKeyHash +ownerKey').catch(() => null);
  if (!ch) return res.status(404).json({ error: 'Challenge not found' });
  req.challenge = ch;
  next();
});

// Loads req.submission from :id and its req.challenge.
export const loadSubmission = asyncHandler(async (req, res, next) => {
  const sub = await Submission.findById(req.params.id).select('+candidateTokenHash').catch(() => null);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });
  req.submission = sub;
  req.challenge = await Challenge.findById(sub.challengeId).select('+ownerKeyHash +ownerKey');
  if (!req.challenge) return res.status(404).json({ error: 'Challenge not found' });
  next();
});

// The poster proves ownership with the header  x-owner-key: <ownerKey>
const checkOwner = asyncHandler(async (req, res, next) => {
  const supplied = req.get('x-owner-key');
  if (!supplied) return res.status(403).json({ error: 'Owner key required' });
  const suppliedHash = hashSecret(supplied);
  const validHash = req.challenge.ownerKeyHash && safeEqualHex(suppliedHash, req.challenge.ownerKeyHash);
  const validLegacy = req.challenge.ownerKey && safeEqualHex(suppliedHash, hashSecret(req.challenge.ownerKey));
  if (!validHash && !validLegacy) return res.status(403).json({ error: 'Owner key required' });
  if (validLegacy && !validHash) {
    req.challenge.ownerKeyHash = suppliedHash;
    req.challenge.ownerKey = undefined;
    req.challenge.set('ownerKey', undefined);
    req.challenge.markModified('ownerKeyHash');
    await req.challenge.save();
  }
  next();
});

const checkCandidate = (req, res, next) => {
  const supplied = req.get('x-candidate-token');
  if (!supplied || !req.submission.candidateTokenHash || !safeEqualHex(hashSecret(supplied), req.submission.candidateTokenHash)) {
    return res.status(403).json({ error: 'Candidate session token required' });
  }
  next();
};

export const requireOwner = [loadChallenge, checkOwner]; // routes where :id is a challenge id
export const requireOwnerOfSubmission = [loadSubmission, checkOwner]; // routes where :id is a submission id
export const requireCandidate = [loadSubmission, checkCandidate];
