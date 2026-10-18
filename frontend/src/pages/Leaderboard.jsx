import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAsync } from '../lib/hooks.js';

export default function Leaderboard() {
  const [skill, setSkill] = useState('');
  const { data, loading, error } = useAsync(() => api.leaderboard(skill || undefined), [skill]);

  useEffect(() => { document.title = 'ProveIt - Leaderboard'; }, []);

  if (loading) return <div className="card center"><span className="spinner" /> Loading the leaderboard…</div>;
  if (error) return <div className="card"><div className="error" role="alert">{error}</div></div>;

  const rows = data?.rows || [];
  const skills = data?.skills || [];
  return (
    <div className="stack">
      <div className="row between">
        <div><h1>Leaderboard</h1><p className="muted">Public rankings from candidates who chose to share qualifying, verified badges.</p></div>
        {skills.length > 0 && <label style={{ minWidth: 210 }}>Skill
          <select value={skill} onChange={(event) => setSkill(event.target.value)} aria-label="Filter leaderboard by skill">
            <option value="">All skills</option>
            {skills.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>}
      </div>
      <section className="card">
        {!rows.length ? <p className="muted">No public verified badges match this view yet.</p> : <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Rank</th><th>Candidate</th><th>Skill</th><th>Score</th><th>Level</th><th>Credential</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={`${row.userId}-${row.skill}`}>
              <td>#{row.rank}</td>
              <td><strong>{row.name}</strong>{row.headline && <div className="muted small">{row.headline}</div>}{row.college && <div className="muted small">{row.college}</div>}</td>
              <td>{row.skill || '—'}</td>
              <td><strong>{row.total}</strong> / 100</td>
              <td><span className="pill good">{row.level || 'Verified'}</span></td>
              <td><Link to={`/badge/${row.badgeId}`}>Verify badge</Link></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
      <p className="muted small">Private submissions, authentication details, rubric evidence, and opted-out users are not included.</p>
    </div>
  );
}
