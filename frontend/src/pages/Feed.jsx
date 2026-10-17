import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAsync } from '../lib/hooks.js';

export default function Feed() {
  const { data: challenges, loading, error } = useAsync(() => api.listLive(), []);

  if (loading) return <div className="card center"><span className="spinner" /></div>;
  if (error) return <div className="card"><div className="error" role="alert">{error}</div></div>;
  if (!challenges?.length) return <div className="card"><p className="muted">No open challenges yet.</p></div>;

  return (
    <div className="stack">
      <div>
        <h1>Open challenges</h1>
        <p className="muted">Explore real tasks from teams hiring and building new ideas.</p>
      </div>
      <div className="grid two">
        {challenges.map((challenge) => {
          const founderMode = challenge.mode === 'idea';
          return (
            <article className="card stack" key={challenge.id}>
              <div className="row">
                <span className="pill info">{founderMode ? 'Founder Mode' : 'Hiring'}</span>
                <span className="pill">{challenge.level}</span>
              </div>
              <div>
                <h2>{challenge.title}</h2>
                <p className="muted">{challenge.skill}</p>
              </div>
              <p className="muted small">{challenge.timeLimitMin} minute challenge</p>
              <div><Link className="btn primary" to={`/c/${challenge.id}`}>Solve this challenge</Link></div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
