const BASE = import.meta.env.VITE_API_URL || '';
async function request(method, path, body, ownerKey) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(ownerKey ? { 'x-owner-key': ownerKey } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
export const api = {
  generateChallenge: (body) => request('POST', '/challenges/generate', body),
  getChallengeOwner: (id, key) => request('GET', `/challenges/${id}/owner`, null, key),
  updateChallenge: (id, body, key) => request('PUT', `/challenges/${id}`, body, key),
  approveChallenge: (id, key) => request('POST', `/challenges/${id}/approve`, null, key),
  leaderboard: (id, key) => request('GET', `/challenges/${id}/leaderboard`, null, key),
  getSubmissionOwner: (sid, key) => request('GET', `/submissions/${sid}/owner`, null, key),
  shortlist: (sid, key) => request('POST', `/submissions/${sid}/shortlist`, null, key),
  override: (sid, body, key) => request('POST', `/submissions/${sid}/override`, body, key),
  getChallenge: (id) => request('GET', `/challenges/${id}`),
  start: (id, body) => request('POST', `/challenges/${id}/start`, body),
  submitAnswer: (sid, answer) => request('POST', `/submissions/${sid}/answer`, { answer }),
  defend: (sid, answers) => request('POST', `/submissions/${sid}/defend`, { answers }),
  getSubmission: (sid) => request('GET', `/submissions/${sid}`),
  requestRereview: (sid) => request('POST', `/submissions/${sid}/rereview`),
  skillGap: (sid) => request('POST', `/submissions/${sid}/skill-gap`),
  mentorEndorse: (sid, body, key) => request('POST', `/submissions/${sid}/mentor`, body, key),
  listLive: () => request('GET', '/challenges?status=live'),
  getBadge: (badgeId) => request('GET', `/badges/${badgeId}`),
};
