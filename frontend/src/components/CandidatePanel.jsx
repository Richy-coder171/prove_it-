import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAsync } from '../lib/hooks.js';

export default function CandidatePanel({ sid, ownerKey, onChanged }) {
  const { data: submission, loading, error: loadError, reload } = useAsync(() => api.getSubmissionOwner(sid, ownerKey), [sid]);
  const [pointsByCriterion, setPointsByCriterion] = useState({});
  const [mentorName, setMentorName] = useState('');
  const [mentorNote, setMentorNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function applyOverride(criterion, points) {
    setBusy(true);
    setError('');
    try {
      await api.override(sid, { criterion: criterion.name, points: Number(points), note: 'Adjusted by poster' }, ownerKey);
      setPointsByCriterion((current) => { const next = { ...current }; delete next[criterion.name]; return next; });
      reload();
      onChanged();
    } catch (err) {
      setError(err.message || 'Could not apply the score adjustment.');
    } finally {
      setBusy(false);
    }
  }

  async function endorse(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.mentorEndorse(sid, { mentorName, note: mentorNote }, ownerKey);
      reload();
      onChanged();
    } catch (err) {
      setError(err.message || 'Could not save the mentor endorsement.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="card center"><span className="spinner" /></div>;
  if (loadError) return <div className="card"><div className="error" role="alert">{loadError}</div></div>;
  if (!submission) return null;

  return (
    <div className="stack">
      {error && <div className="error" role="alert">{error}</div>}
      <section className="card stack">
        <div><h2>{submission.name}</h2><div className="muted small">{submission.email}</div></div>
        <div>
          <h3>Written answer</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{submission.answer}</pre>
        </div>
        <div className="stack">
          <h3>Defence</h3>
          {(submission.qa || []).map((item, index) => <div key={`${index}-${item.q}`}><strong>{item.q}</strong><p className={item.a ? '' : 'muted'}>{item.a || 'No answer'}</p></div>)}
        </div>
        <div className="stack">
          <h3>Score breakdown</h3>
          <strong>Current total: {submission.score?.total ?? 0}</strong>
          {(submission.score?.criteria || []).map((criterion, index) => {
            const points = pointsByCriterion[criterion.name] ?? criterion.points;
            return (
              <div className="card soft stack" key={`${criterion.name}-${index}`}>
                <div className="row between"><strong>{criterion.name}</strong><strong>{criterion.points} / {criterion.weight}</strong></div>
                <p>{criterion.why}</p>
                {(criterion.evidence || []).map((text, evidenceIndex) => <div className="quote" key={`${evidenceIndex}-${text}`}>&quot;{text}&quot;</div>)}
                {criterion.overridden && <div className="muted small">AI scored {criterion.aiPoints}, you set {criterion.points}</div>}
                <div className="row">
                  <input aria-label={`Points for ${criterion.name}`} type="number" min="0" max={criterion.weight} value={points} onChange={(event) => setPointsByCriterion((current) => ({ ...current, [criterion.name]: event.target.value }))} style={{ maxWidth: 120 }} />
                  <button className="btn small" type="button" disabled={busy || points === '' || Number(points) < 0 || Number(points) > criterion.weight} onClick={() => applyOverride(criterion, points)}>Apply</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card stack">
        <h3>Mentor endorsement</h3>
        <p className="muted">Mentors review only the top few candidates</p>
        {submission.mentor ? (
          <div className="quote"><strong>Mentor reviewed by {submission.mentor.name}</strong><br />{submission.mentor.note}</div>
        ) : (
          <form className="stack" onSubmit={endorse}>
            <div><label htmlFor="mentor-name">Mentor name</label><input id="mentor-name" value={mentorName} onChange={(event) => setMentorName(event.target.value)} required disabled={busy} /></div>
            <div><label htmlFor="mentor-note">Short note</label><input id="mentor-note" value={mentorNote} onChange={(event) => setMentorNote(event.target.value)} required disabled={busy} /></div>
            <div><button className="btn primary" type="submit" disabled={busy}>Endorse</button></div>
          </form>
        )}
        {busy && <div className="row"><span className="spinner" /></div>}
      </section>
    </div>
  );
}
