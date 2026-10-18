import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import { useAsync } from '../lib/hooks.js';

function statusLabel(status) {
  return status === 'live' ? 'Published' : 'Draft';
}

export default function StartupDashboard() {
  const { user } = useAuth();
  const { data: challenges, loading, error, reload } = useAsync(() => api.myChallenges(), [user?.id]);

  useEffect(() => {
    document.title = 'ProveIt - Startup dashboard';
  }, []);

  return (
    <div className="stack">
      <section className="card startup-hero">
        <div>
          <span className="pill warn">Startup workspace</span>
          <h1 style={{ marginTop: 12 }}>Welcome, {user?.name || 'startup'}.</h1>
          <p className="muted">Turn real work into a fair signal. Create a challenge, publish it, and review the candidates who complete it.</p>
        </div>
        <Link className="btn primary" to="/post">Post a challenge</Link>
      </section>

      <section className="card stack">
        <div className="row between">
          <div><h2>Your challenges</h2><p className="muted small">Only challenges created by this startup account appear here.</p></div>
          <Link className="btn ghost" to="/post">New challenge</Link>
        </div>
        {loading && <div className="center"><span className="spinner" /> Loading your challenges…</div>}
        {error && <div className="error" role="alert">{error}<button className="btn small ghost" type="button" onClick={reload} style={{ marginLeft: 10 }}>Try again</button></div>}
        {!loading && !error && !challenges?.length && <div className="card soft"><p className="muted">No challenges yet. Your first challenge will appear here after the generation step.</p><Link className="btn primary" to="/post">Create your first challenge</Link></div>}
        {!loading && !error && challenges?.length > 0 && <div className="stack">
          {challenges.map((challenge) => (
            <article className="card soft row between" key={challenge.id}>
              <div>
                <div className="row"><span className={`pill ${challenge.status === 'live' ? 'good' : 'warn'}`}>{statusLabel(challenge.status)}</span><span className="muted small">{challenge.submissionCount || 0} submissions</span></div>
                <h3 style={{ marginTop: 8 }}>{challenge.title || 'Untitled challenge'}</h3>
                <p className="muted small">{challenge.skill || 'Skill challenge'} · {challenge.timeLimitMin || 30} minutes</p>
              </div>
              {challenge.status === 'live'
                ? <Link className="btn ghost" to={`/dashboard/${challenge.id}`}>Review submissions</Link>
                : <Link className="btn ghost" to={`/review/${challenge.id}`}>Finish draft</Link>}
            </article>
          ))}
        </div>}
      </section>
    </div>
  );
}
