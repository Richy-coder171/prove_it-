import { createHmac, timingSafeEqual } from 'crypto';

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export function median(arr) {
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

// Pulls the first JSON object/array out of model output (handles ```json fences and chatter).
export function extractJson(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('AI returned no text');
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const first = s.search(/[{[]/);
  if (first === -1) throw new Error('No JSON found in AI output');
  const close = s[first] === '{' ? '}' : ']';
  const last = s.lastIndexOf(close);
  if (last <= first) throw new Error('Unterminated JSON in AI output');
  s = s.slice(first, last + 1);
  try {
    return JSON.parse(s);
  } catch {
    return JSON.parse(s.replace(/,\s*([}\]])/g, '$1'));
  }
}

const words = (t) =>
  String(t || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

// Share of the needle's words that appear in the haystack (0..1). Used to verify evidence quotes.
export function tokenOverlap(needle, haystack) {
  const n = words(needle);
  if (!n.length) return 0;
  const h = new Set(words(haystack));
  return n.filter((w) => h.has(w)).length / n.length;
}
const badgePayload = (badge) => JSON.stringify({
  badgeId: badge.badgeId,
  name: badge.name,
  skill: badge.skill,
  level: badge.level,
  total: badge.total,
  issuedAt: badge.issuedAt,
  authenticity: badge.authenticity ?? null,
  mentor: badge.mentor ? { name: badge.mentor.name, note: badge.mentor.note } : null,
  challengeTitle: badge.challengeTitle,
  criteria: (badge.criteria || []).map(({ name, weight, points, why }) => ({ name, weight, points, why })),
});

export function signBadge(badge) {
  const secret = process.env.BADGE_SECRET;
  if (!secret) throw new Error('BADGE_SECRET must be configured to issue badges');
  return createHmac('sha256', secret).update(badgePayload(badge)).digest('hex');
}

export function verifyBadge(badge) {
  if (!badge?.signature || !process.env.BADGE_SECRET) return false;
  const expected = Buffer.from(signBadge(badge), 'hex');
  const actual = Buffer.from(String(badge.signature), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
