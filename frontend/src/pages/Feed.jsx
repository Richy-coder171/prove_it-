import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAsync } from '../lib/hooks.js';
import { motion, useReducedMotion } from 'framer-motion';
import { BadgeIcon, BriefcaseIcon, ChallengeIcon } from '../components/DomainVisuals.jsx';

export default function Feed() {
  useEffect(() => {
    document.title = 'ProveIt - Open challenges';
  }, []);
  const { data: challenges, loading, error } = useAsync(() => api.listLive(), []);
  const reduceMotion = useReducedMotion();

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
        {challenges.map((challenge, index) => {
          const founderMode = challenge.mode === 'idea';
          return (
            <motion.article
              className="card stack"
              key={challenge.id}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.28, delay: reduceMotion ? 0 : Math.min(index * 0.055, 0.33), ease: 'easeOut' }}
              whileHover={reduceMotion ? undefined : { y: -3 }}
            >
              <div className="opportunity-card__visual">
                <span className="opportunity-card__icon">{founderMode ? <ChallengeIcon size={25} /> : <BriefcaseIcon size={25} />}</span>
                <span className="opportunity-card__spark"><BadgeIcon size={19} /></span>
              </div>
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
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
