import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { getOwnerKey } from '../lib/store.js';
import { useAsync } from '../lib/hooks.js';
import CandidatePanel from '../components/CandidatePanel.jsx';

function authenticityTone(label) {
  if (!label) return '';
  if (label.startsWith('High')) return 'good';
  if (label.startsWith('Medium')) return 'warn';
  if (label.startsWith('Low')) return 'bad';
  return 'info';
}

export default function Dashboard() {
  useEffect(() => {
    document.title = 'ProveIt - Dashboard';
  }, []);
  const { id } = useParams();
  const key = getOwnerKey(id);
  const { data: challenge, loading: challengeLoading, error: challengeError } = useAsync(
    () => api.getChallengeOwner(id, key),
    [id],
  );
  const [rows, setRows] = useState([]);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [rowsError, setRowsError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyRow, setBusyRow] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);
  const shareLink = `${window.location.origin}/c/${id}`;
  const reloadRows = useCallback(async () => {
    try {
      const result = await api.leaderboard(id, key);
      setRows(result);
      setRowsError('');
    } catch (err) {
      setRowsError(err.message || 'Could not load the leaderboard.');
    } finally {
      setRowsLoaded(true);
    }
  }, [id, key]);

  useEffect(() => {
    reloadRows();
    const timer = setInterval(reloadRows, 8000);
    return () => clearInterval(timer);
  }, [reloadRows]);
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  async function toggleShortlist(event, row) {
    event.stopPropagation();
    setBusyRow(row.id);
    setActionError('');
    try {
      await api.shortlist(row.id, key);
      await reloadRows();
    } catch (err) {
      setActionError(err.message || 'Could not update the shortlist.');
    } finally {
      setBusyRow('');
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setActionError(err.message || 'Could not copy the candidate link.');
    }
  }

  if (challengeLoading || !rowsLoaded) return <div className="card center"><span className="spinner" /></div>;
  if (challengeError) return <div className="card"><div className="error" role="alert">{challengeError}</div></div>;
  if (!challenge) return null;

  const founderMode = challenge.mode === 'idea';
  const shortlisted = rows.filter((row) => row.shortlisted);
  const mentor = rows.find((row) => row.mentor);
  return (
    <div className="stack">
      <section className="card stack">
        <div>
          <h1>{challenge.title}</h1>
          <div className="row">
            <span className="pill info">{founderMode ? 'Founder Mode' : 'Hiring'}</span>
            <span className={`pill ${challenge.status === 'live' ? 'good' : 'warn'}`}>{challenge.status}</span>
          </div>
        </div>
        <div className="card soft stack">
          <label htmlFor="candidate-link">Candidate link</label>
          <div className="row">
            <input id="candidate-link" readOnly value={shareLink} />
            <button className="btn ghost" type="button" onClick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
          </div>
        </div>
      </section>

      <section className="card stack">
        <h2>{founderMode ? 'Ranked potential co-founders and teammates' : 'Ranked candidates'}</h2>
        {rowsError && <div className="error" role="alert">{rowsError}</div>}
        {rows.length === 0 && !rowsError ? <p className="muted">No candidates yet. Share the link above.</p> : rows.length > 0 && (
          <div style={{ overflowX: "auto" }}><table className="table">
            <thead><tr><th>#</th><th>Name</th><th>Score</th><th>Reasoning</th><th>Authenticity</th><th>Flags</th><th>Shortlist</th><th>Badge</th></tr></thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="clickable" style={selectedId === row.id ? { background: 'var(--panel-2)' } : undefined} onClick={() => setSelectedId(row.id)}>
                  <td>{index + 1}</td>
                  <td>{row.name}</td>
                  <td><strong>{row.total}</strong></td>
                  <td>{row.reasoning}/{row.reasoningMax}</td>
                  <td>{row.authenticity ? <span className={`pill ${authenticityTone(row.authenticity)}`}>{row.authenticity}</span> : <span className="muted">—</span>}</td>
                  <td><div className="row">
                    {row.flagged && <span className="pill warn">Needs human review</span>}
                    {row.rereviewRequested && <span className="pill info">Re-review requested</span>}
                    {row.mentor && <span className="pill good">Mentor: {row.mentor.name}</span>}
                  </div></td>
                  <td><button className="btn small" type="button" disabled={busyRow === row.id} aria-label={row.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'} onClick={(event) => toggleShortlist(event, row)}>{row.shortlisted ? '★' : '☆'}</button></td>
                  <td>{row.badgeId && <Link to={`/badge/${row.badgeId}`} onClick={(event) => event.stopPropagation()}>Badge</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        {actionError && <div className="error" role="alert">{actionError}</div>}
      </section>

      {selectedId && <CandidatePanel key={selectedId} sid={selectedId} ownerKey={key} onChanged={reloadRows} />}

      {shortlisted.length > 0 && (
        <section className="card stack">
          <div className="card soft"><strong>Idea → Team → Skills → Venture</strong></div>
          <div><strong>Idea:</strong> {challenge.title}</div>
          <div className="row"><strong>Team:</strong>{shortlisted.map((row) => <span className="pill info" key={row.id}>{row.name}</span>)}</div>
          <div><strong>Mentor:</strong> {mentor ? mentor.mentor.name : <span className="muted">Waiting for a mentor endorsement</span>}</div>
        </section>
      )}
    </div>
  );
}
