const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
export const saveOwnerKey = (challengeId, key) => write(`pi_owner_${challengeId}`, key);
export const getOwnerKey = (challengeId) => read(`pi_owner_${challengeId}`);
export const saveSession = (challengeId, session) => {
  const old = read(`pi_session_${challengeId}`);
  if (!session) {
    if (old?.sid) { try { localStorage.removeItem(`pi_candidate_${old.sid}`); } catch { /* ignore */ } }
    return write(`pi_session_${challengeId}`, null);
  }
  if (old?.sid && old.sid !== session.sid) { try { localStorage.removeItem(`pi_candidate_${old.sid}`); } catch { /* ignore */ } }
  const storedSession = { ...session };
  if (storedSession.sid && storedSession.candidateToken) {
    write(`pi_candidate_${storedSession.sid}`, storedSession.candidateToken);
    delete storedSession.candidateToken;
  }
  return write(`pi_session_${challengeId}`, storedSession);
};
export const getSession = (challengeId) => read(`pi_session_${challengeId}`);
export const getCandidateToken = (submissionId) => read(`pi_candidate_${submissionId}`);
