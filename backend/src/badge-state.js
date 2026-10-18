import crypto from 'crypto';
import { signBadge, verifyBadge } from './util.js';

// Keep these rules in one place so issuing, regrading, and public verification
// cannot drift apart.
export const BADGE_ISSUE_THRESHOLD = 70;
export const BADGE_ADVANCED_THRESHOLD = 85;

export function scoreTotal(criteria = []) {
  return Math.round(criteria.reduce((sum, item) => sum + Number(item?.points || 0), 0));
}

export function badgeLevelForScore(total) {
  const value = Number(total);
  if (value >= BADGE_ADVANCED_THRESHOLD) return 'Advanced';
  if (value >= BADGE_ISSUE_THRESHOLD) return 'Intermediate';
  return null;
}

export function badgeCriteriaFromScore(score) {
  return (score?.criteria || []).map(({ name, weight, points, why }) => ({ name, weight, points, why }));
}

function newBadgeId() {
  return `PI-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function appendBadgeEvent(submission, event) {
  submission.badgeEvents = [...(submission.badgeEvents || []), {
    ...event,
    at: new Date(),
    total: Number(submission.score?.total || 0),
    badgeId: submission.badge?.badgeId || submission.badgeId || null,
  }].slice(-25);
}

function updateBadgeFields(submission, challenge) {
  const badge = submission.badge || {};
  const total = Number(submission.score?.total || 0);
  badge.badgeId ||= submission.badgeId || newBadgeId();
  badge.name = submission.name;
  badge.skill = challenge.skill;
  badge.level = badgeLevelForScore(total);
  badge.total = total;
  badge.issuedAt ||= new Date().toISOString();
  badge.authenticity = submission.score?.authenticity?.level || null;
  badge.mentor = submission.mentor?.name
    ? { name: submission.mentor.name, note: submission.mentor.note || '' }
    : null;
  badge.challengeTitle = challenge.title;
  badge.criteria = badgeCriteriaFromScore(submission.score);
  badge.signature = signBadge(badge);
  submission.badge = badge;
  submission.badgeId = badge.badgeId;
  submission.markModified('badge');
}

/**
 * Synchronize the credential snapshot with the current score. A revoked badge
 * keeps its id and audit history so a later valid override can restore the
 * same credential instead of issuing duplicates.
 */
export function syncBadgeState(submission, challenge, { reason = 'score_updated' } = {}) {
  if (submission.score?.criteria) {
    submission.score.total = scoreTotal(submission.score.criteria);
    submission.markModified('score');
  }
  const total = Number(submission.score?.total || 0);
  const eligible = Number.isFinite(total) && total >= BADGE_ISSUE_THRESHOLD;
  const hadBadge = Boolean(submission.badge?.badgeId || submission.badgeId);
  const wasValid = submission.badgeStatus === 'valid';

  if (eligible) {
    updateBadgeFields(submission, challenge);
    if (!wasValid) appendBadgeEvent(submission, { type: hadBadge ? 'restored' : 'issued', reason });
    submission.badgeStatus = 'valid';
    submission.badgeRevokedAt = null;
    return submission.badge;
  }

  if (hadBadge) {
    // Keep the revised score and criterion breakdown auditable, but make the
    // credential unusable until the score qualifies again.
    updateBadgeFields(submission, challenge);
    if (wasValid || !submission.badgeRevokedAt) {
      appendBadgeEvent(submission, { type: 'revoked', reason: 'score_below_issuance_threshold' });
      submission.badgeRevokedAt = new Date();
    }
    submission.badgeStatus = 'revoked';
  }
  return submission.badge;
}

export function isPubliclyValidBadge(submission) {
  const badge = submission?.badge;
  const total = Number(submission?.score?.total ?? badge?.total);
  return Boolean(
    badge
      && submission?.badgeId
      && (submission.badgeStatus === undefined || submission.badgeStatus === null || submission.badgeStatus === 'valid')
      && Number.isFinite(total)
      && total >= BADGE_ISSUE_THRESHOLD
      && Number(badge.total) === total
      && verifyBadge(badge),
  );
}
