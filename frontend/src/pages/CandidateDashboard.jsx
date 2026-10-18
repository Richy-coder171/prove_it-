import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Feed from './Feed.jsx';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import { useAsync } from '../lib/hooks.js';
import { CandidateProofVisual } from '../components/DomainVisuals.jsx';

export default function CandidateDashboard() {
  const { user } = useAuth();
  const { data, loading } = useAsync(() => api.me(), [user?.id]);

  useEffect(() => {
    document.title = 'ProveIt - Candidate opportunities';
  }, []);

  const stats = data?.stats || {};
  return (
    <div className="stack">
      <section className="card candidate-hero">
        <div className="candidate-hero__copy">
          <span className="pill info">Candidate workspace</span>
          <h1 style={{ marginTop: 12 }}>Welcome, {user?.name || 'candidate'}.</h1>
          <p className="muted">Find practical opportunities, complete the work, and build proof you can share.</p>
        </div>
        <div className="grid three" aria-label="Candidate progress">
          <div className="card soft"><strong>{loading ? '—' : stats.attempts ?? 0}</strong><div className="muted small">Attempts</div></div>
          <div className="card soft"><strong>{loading ? '—' : stats.badges ?? 0}</strong><div className="muted small">Valid badges</div></div>
          <div className="card soft"><strong>{loading ? '—' : stats.bestScore ?? '—'}</strong><div className="muted small">Best score</div></div>
        </div>
        <div className="row">
          <Link className="btn ghost" to="/profile">View profile and results</Link>
          <Link className="btn ghost" to="/leaderboard">See verified leaderboard</Link>
        </div>
        <CandidateProofVisual />
      </section>
      <Feed />
    </div>
  );
}
