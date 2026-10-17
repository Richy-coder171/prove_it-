import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const examples = {
  job: {
    mode: 'Hiring',
    title: 'Junior Data Analyst',
    skill: 'Data analysis',
    task: 'Find a useful trend in weekly sales data. Check it, then explain what the founders should know.',
  },
  idea: {
    mode: 'Founder Mode',
    title: 'College tiffin delivery',
    skill: 'Product development',
    task: 'Map the first order flow for a hostel, then show how you would test demand with nearby cooks.',
  },
};

function ProofReceipt({ mode, onModeChange }) {
  const example = examples[mode];
  return (
    <div className="home__receipt" data-ui aria-label="Interactive challenge preview">
      <div className="home__receipt-top">
        <span>Challenge preview</span>
        <span className="home__receipt-status">Draft</span>
      </div>
      <div className="home__mode-switch" role="group" aria-label="Choose a challenge type">
        {Object.entries(examples).map(([key, item]) => (
          <button key={key} type="button" aria-pressed={mode === key} onClick={() => onModeChange(key)}>
            {item.mode}
          </button>
        ))}
      </div>
      <div className="home__receipt-body">
        <span className="home__receipt-skill">{example.skill} · 30 minutes</span>
        <h2>{example.title}</h2>
        <p>{example.task}</p>
      </div>
      <div className="home__receipt-foot">
        <span>Task → spoken defence → evidence</span>
        <span aria-hidden="true">100</span>
      </div>
    </div>
  );
}

function StageInterface({ stage }) {
  if (stage === 'solve') return (
    <div className="home__mini-ui" data-ui>
      <span className="home__ui-label">Candidate task</span>
      <strong>Junior Data Analyst</strong>
      <p>Review a weekly sales report. Find one trend and explain how you would validate it.</p>
      <div className="home__ui-meta"><span>30 min</span><span>Data analysis</span></div>
    </div>
  );
  if (stage === 'defend') return (
    <div className="home__mini-ui" data-ui>
      <span className="home__ui-label">Question about your answer</span>
      <strong>What evidence supports that trend?</strong>
      <p className="home__ui-answer">“I’d compare the same pattern across another time window.”</p>
      <div className="home__ui-meta"><span>Spoken answer</span><span>Editable transcript</span></div>
    </div>
  );
  if (stage === 'score') return (
    <div className="home__mini-ui" data-ui>
      <span className="home__ui-label">Example rubric score</span>
      <div className="home__score-row"><strong>Data reasoning</strong><strong>26 / 30</strong></div>
      <p className="home__ui-answer">“Compare the same pattern across another time window.”</p>
      <div className="home__ui-meta"><span>Criterion evidence</span><span>Human review available</span></div>
    </div>
  );
  return (
    <div className="home__mini-ui home__mini-badge" data-ui>
      <span className="home__ui-label">Badge format preview</span>
      <strong>Data analysis</strong>
      <div className="home__badge-number">86<span> / 100</span></div>
      <div className="home__ui-meta"><span>Signed result</span><span>Public verification</span></div>
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState('job');
  const homeRef = useRef(null);

  useEffect(() => {
    const root = homeRef.current;
    if (!root || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
    root.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
    root.classList.add('motion-ready');
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="home" ref={homeRef}>
      <section className="home__hero">
        <div className="home__hero-copy">
          <h1 data-reveal>Show the work.<br />Defend it.</h1>
          <p data-reveal>Anyone can get an AI to write an answer. ProveIt finds the people who can defend it.</p>
          <div className="home__actions" data-reveal>
            <Link className="home__button" to="/post">Post a challenge</Link>
            <Link className="home__text-link" to="/feed">See opportunities</Link>
          </div>
        </div>
        <div className="home__hero-image">
          <ProofReceipt mode={mode} onModeChange={setMode} />
        </div>
      </section>

      <section className="home__process" aria-label="How ProveIt works">
        {[
          { id: 'solve', title: 'Solve', copy: "A timed, real-world micro-task from the startup's actual work." },
          { id: 'defend', title: 'Defend', copy: 'AI asks 2-3 questions about YOUR answer. You reply by voice.' },
          { id: 'score', title: 'Evidence', copy: 'A rubric ties every score to words from your answer.' },
          { id: 'badge', title: 'Get verified', copy: 'A signed badge anyone can check with a link or QR code.' },
        ].map((item, index) => (
          <article className={`home__stage home__stage--${index + 1}`} key={item.id}>
            {index === 0 && <h2>From task to badge</h2>}
            <div className="home__stage-ui" data-reveal><StageInterface stage={item.id} /></div>
            <div className="home__stage-copy" data-reveal>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="home__audience" aria-label="Who ProveIt serves">
        {[
          ['Entrepreneurs', 'Test ideas and find co-founders who can actually deliver.'],
          ['Job seekers', 'Prove skill without pedigree and build a portable profile.'],
          ['Startups and recruiters', 'A pre-ranked, explainable shortlist instead of a pile of resumes.'],
          ['Mentors', 'Review only the top few and endorse the best.'],
        ].map(([title, copy]) => (
          <article className="home__audience-row" data-reveal key={title}>
            <h2>{title}</h2><p>{copy}</p>
          </article>
        ))}
      </section>

      <section className="home__responsible">
        <div className="home__responsible-copy" data-reveal>
          <h2>Responsible AI</h2>
          <p>AI recommends, humans decide. Only the content of answers is scored, never face, accent or demographics. Candidates see their full breakdown and can request a human re-review.</p>
        </div>
        <div className="home__responsible-ui" data-reveal>
          <div className="home__review-ui" data-ui>
            <span className="home__ui-label">Example evidence you can inspect</span>
            <strong>Reasoning and trade-offs</strong>
            <p>Evidence from the candidate’s answer</p>
            <blockquote>“I would test the same pattern on another time window.”</blockquote>
            <span className="home__review-status">Human re-review available</span>
          </div>
        </div>
      </section>

      <section className="home__close">
        <div className="home__close-copy" data-reveal>
          <h2>Make proof<br />the starting point.</h2>
          <p>Post a challenge for a job or an idea, or find an open opportunity to solve.</p>
          <div className="home__actions">
            <Link className="home__button home__button--dark" to="/post">Post a challenge</Link>
            <Link className="home__text-link home__text-link--dark" to="/feed">See opportunities</Link>
          </div>
        </div>
        <div className="home__close-ui" data-reveal>
          <div className="home__create-ui" data-ui>
            <span className="home__ui-label">First, choose what you’re building</span>
            <h3>Create a challenge</h3>
            <div className="home__create-choices" aria-label="Challenge type examples">
              <span>I’m hiring</span>
              <span>I have an idea</span>
            </div>
            <p>AI drafts the task and scoring rubric. Review it before anything goes live.</p>
            <Link className="home__button home__button--dark" to="/post">Start a challenge</Link>
          </div>
        </div>
        <footer className="home__footer"><span>ProveIt</span></footer>
      </section>
    </div>
  );
}
