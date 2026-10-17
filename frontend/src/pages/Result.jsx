import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { saveSession } from '../lib/store.js';
import { useAsync } from '../lib/hooks.js';

function CriterionCard({ criterion }) {
  const evidence = criterion.evidence || [];
  return (
    <div className="card stack">
      <div className="row between">
        <h3>{criterion.name}</h3>
        <strong>{criterion.points} / {criterion.weight}</strong>
      </div>
      <div className="bar"><i style={{ width: `${criterion.percent}%` }} /></div>
      <p>{criterion.why}</p>
      {evidence.length > 0 && (
        <div className="stack">
          <div className="muted small">Evidence from your answer</div>
          {evidence.map((text, index) => <div className="quote" key={`${index}-${text}`}>&quot;{text}&quot;</div>)}
        </div>
      )}
      {criterion.overridden && <div><span className="pill info">Adjusted by a human reviewer</span></div>}
    </div>
  );
}

export default function Result() {
  const { sid } = useParams();
  const navigate = useNavigate();
  const { data: submission, loading, error: loadError } = useAsync(() => api.getSubmission(sid), [sid]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [requestedFor, setRequestedFor] = useState('');
  const [gapResult, setGapResult] = useState(null);
  const requested = submission?.rereviewRequested || requestedFor === sid;
  const gaps = gapResult?.sid === sid ? gapResult.gaps : null;

  async function requestRereview() {
    setBusy('rereview');
    setError('');
    try {
      await api.requestRereview(sid);
      setRequestedFor(sid);
    } catch (err) {
      setError(err.message || 'Could not request a human re-review.');
    } finally {
      setBusy('');
    }
  }

  async function getLearningPlan() {
    setBusy('skill-gap');
    setError('');
    try {
      const result = await api.skillGap(sid);
      setGapResult({ sid, gaps: result.gaps || [] });
    } catch (err) {
      setError(err.message || 'Could not create your learning plan.');
    } finally {
      setBusy('');
    }
  }

  function retryChallenge() {
    saveSession(submission.challengeId, null);
    navigate(`/c/${submission.challengeId}?retry=1`);
  }

  if (loading) return <div className="card center"><span className="spinner" /></div>;
  if (loadError) return <div className="card"><div className="error" role="alert">{loadError}</div></div>;
  if (!submission) return null;
  if (submission.status !== 'graded' || !submission.score) return (
    <div className="card stack">
      <div className="notice">This attempt is not finished yet.</div>
      <div><Link className="btn primary" to={`/c/${submission.challengeId}`}>Continue</Link></div>
    </div>
  );

  const { score } = submission;
  const authTone = { high: 'good', medium: 'warn', low: 'bad' }[score.authenticity.key] || 'info';
  return (
    <div className="stack">
      <section className="card stack">
        <div className="row between">
          <h1>{submission.name}</h1>
          <div className="score-big">{score.total}<span className="muted small"> / 100</span></div>
        </div>
        <div><span className={`pill ${authTone}`}>{score.authenticity.level}</span></div>
        <p className="muted small">The authenticity signal shows how consistent your spoken explanation was with your solution. It is a confidence indicator, not an accusation.</p>
        {(score.authenticity.reasons || []).length > 0 && <ul className="small">{score.authenticity.reasons.map((reason, index) => <li key={`${index}-${reason}`}>{reason}</li>)}</ul>}
        {score.flagged && <div className="notice">The AI scores varied between runs, so a human will double-check this result.</div>}
      </section>

      <h2>Why you got this score</h2>
      {(score.criteria || []).map((criterion, index) => <CriterionCard key={`${criterion.name}-${index}`} criterion={criterion} />)}

      <div className="row">
        {submission.badgeId && <Link className="btn primary" to={`/badge/${submission.badgeId}`}>View my verified badge</Link>}
        <button className="btn ghost" type="button" disabled={busy !== '' || requested} onClick={requestRereview}>{requested ? 'Re-review requested' : 'Request human re-review'}</button>
      </div>
      {(loadError || error) && <div className="error" role="alert">{error || loadError}</div>}
      {busy && <div className="row"><span className="spinner" /> <span className="muted small">{busy === 'skill-gap' ? 'Preparing your learning plan...' : 'Sending your request...'}</span></div>}

      {score.total < 70 && (
        <section className="card stack">
          <h2>Skill-gap guide</h2>
          <p className="muted">Not where you wanted to be? Here is how to improve.</p>
          {gaps === null && <div><button className="btn primary" type="button" disabled={busy !== ''} onClick={getLearningPlan}>Get my learning plan</button></div>}
          {gaps?.map((gap, index) => (
            <div className="card soft stack" key={`${gap.criterion}-${index}`}>
              <h3>{gap.criterion}</h3>
              <p><strong>What to learn:</strong> {gap.whatToLearn}</p>
              <p><strong>Practice:</strong> {gap.practice}</p>
            </div>
          ))}
          <div><button className="btn ghost" type="button" disabled={busy !== ''} onClick={retryChallenge}>Retry the challenge</button></div>
        </section>
      )}
    </div>
  );
}
