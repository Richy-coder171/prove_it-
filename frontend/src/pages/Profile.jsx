import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAsync } from '../lib/hooks.js';
import { useAuth } from '../lib/auth.jsx';
import { getAccountRole } from '../lib/roles.js';

const fields = [
  ['name', 'Name', 'text'],
  ['headline', 'Headline', 'text'],
  ['college', 'College or university', 'text'],
  ['city', 'City', 'text'],
  ['linkedin', 'LinkedIn URL', 'url'],
  ['github', 'GitHub URL', 'url'],
];

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, errorStatus, reload } = useAsync(() => api.me(), [user?.id]);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!data?.user) return;
    setDraft(data.user);
    setUser(data.user);
    document.title = `ProveIt - ${data.user.name}`;
  }, [data?.user, setUser]);

  if (!user) return (
    <section className="card stack" style={{ maxWidth: 620, margin: '0 auto' }}>
      <h1>Your profile</h1>
      <p className="muted">Log in to see your attempts, performance statistics, and verified badges.</p>
      <div><Link className="btn primary" to="/login?next=/profile">Log in</Link></div>
    </section>
  );

  if (loading && !data) return <div className="card center"><span className="spinner" /> Loading your profile…</div>;
  if (errorStatus === 401 || errorStatus === 403) return (
    <section className="card stack" style={{ maxWidth: 620, margin: '0 auto' }}>
      <h1>Session expired</h1>
      <p className="muted">Please log in again to view your profile.</p>
      <div><button className="btn primary" type="button" onClick={async () => { await logout(); navigate('/login?next=/profile', { replace: true }); }}>Log in again</button></div>
    </section>
  );
  if (error && !data) return <div className="card"><div className="error" role="alert">{error}</div><button className="btn ghost" type="button" onClick={reload}>Try again</button></div>;

  const profile = draft || data?.user || user;
  const attempts = data?.attempts || [];
  const stats = data?.stats || {};

  function update(field, value) {
    setDraft((current) => ({ ...(current || profile), [field]: value }));
    setMessage('');
    setSaveError('');
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setSaveError('');
    const body = Object.fromEntries(fields.map(([field]) => [field, String(profile[field] || '').trim()]));
    body.bio = String(profile.bio || '').trim();
    body.showOnLeaderboard = Boolean(profile.showOnLeaderboard);
    try {
      const result = await api.updateMe(body);
      setDraft(result.user);
      setUser(result.user);
      setMessage('Profile saved.');
      await reload();
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) {
        await logout();
        navigate('/login?next=/profile', { replace: true });
      } else setSaveError(requestError.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <h1>Your profile</h1>
        <p className="muted">{profile.email} · Keep your professional context and verified work together.</p>
      </div>
      <div className="grid three">
        <div className="card"><div className="muted small">Attempts</div><h2>{stats.attempts ?? 0}</h2></div>
        <div className="card"><div className="muted small">Verified badges</div><h2>{stats.badges ?? 0}</h2></div>
        <div className="card"><div className="muted small">Best score</div><h2>{stats.bestScore ?? '—'}{stats.bestScore !== null && stats.bestScore !== undefined ? <span className="muted small"> / 100</span> : null}</h2></div>
        <div className="card"><div className="muted small">Average score</div><h2>{stats.averageScore ?? '—'}{stats.averageScore !== null && stats.averageScore !== undefined ? <span className="muted small"> / 100</span> : null}</h2></div>
      </div>
      <section className="card stack">
        <div><h2>Profile details</h2><p className="muted small">Only supported profile fields are editable. Email and account credentials stay protected.</p></div>
        <form className="stack" onSubmit={save}>
          <div className="grid two">
            {fields.map(([field, label, type]) => <div key={field}>
              <label htmlFor={`profile-${field}`}>{label}</label>
              <input id={`profile-${field}`} type={type} value={profile[field] || ''} onChange={(event) => update(field, event.target.value)} />
            </div>)}
          </div>
          <div>
            <label htmlFor="profile-bio">Bio</label>
            <textarea id="profile-bio" value={profile.bio || ''} maxLength={500} onChange={(event) => update('bio', event.target.value)} />
          </div>
          <label className="row small" htmlFor="profile-leaderboard" style={{ alignItems: 'flex-start' }}>
            <input id="profile-leaderboard" type="checkbox" checked={Boolean(profile.showOnLeaderboard)} onChange={(event) => update('showOnLeaderboard', event.target.checked)} style={{ width: 'auto', minHeight: 0, marginTop: 4 }} />
            <span>Show my supported badge information on the public leaderboard.<br /><span className="muted">This can display your name, skill, score, level, and mentor name for qualifying badges.</span></span>
          </label>
          {saveError && <div className="error" role="alert">{saveError}</div>}
          {message && <div className="notice" role="status">{message}</div>}
          <div><button className="btn primary" type="submit" disabled={saving}>{saving ? <><span className="spinner" /> Saving…</> : 'Save profile'}</button></div>
        </form>
      </section>
      <section className="card stack">
        <div><h2>Your challenge history</h2><p className="muted small">Scores and badges shown here come from your authenticated account.</p></div>
        {!attempts.length ? <p className="muted">No challenge attempts yet. {getAccountRole(user) === 'candidate' ? <><Link to="/feed">Explore open challenges</Link>.</> : <><Link to="/startup/dashboard">Return to your startup dashboard</Link>.</>}</p> : <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Challenge</th><th>Skill</th><th>Status</th><th>Score</th><th>Credential</th></tr></thead>
            <tbody>{attempts.map((attempt) => <tr key={attempt.submissionId}>
              <td>{attempt.challengeTitle || 'Challenge'}</td>
              <td>{attempt.skill || '—'}</td>
              <td><span className={`pill ${attempt.status === 'graded' ? 'good' : 'info'}`}>{attempt.status}</span></td>
              <td>{attempt.total ?? '—'}{attempt.total !== null && attempt.total !== undefined ? ' / 100' : ''}</td>
              <td>{attempt.badgeId ? <Link to={`/badge/${attempt.badgeId}`}>{attempt.level || 'View badge'}</Link> : <span className="muted">None</span>}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
    </div>
  );
}
