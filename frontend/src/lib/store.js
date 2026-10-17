const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
export const saveOwnerKey = (challengeId, key) => write(`pi_owner_${challengeId}`, key);
export const getOwnerKey = (challengeId) => read(`pi_owner_${challengeId}`);
export const saveSession = (challengeId, session) => write(`pi_session_${challengeId}`, session);
export const getSession = (challengeId) => read(`pi_session_${challengeId}`);
