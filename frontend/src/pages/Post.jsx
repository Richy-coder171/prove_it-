import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { saveOwnerKey } from '../lib/store.js';

const examples = {
  job: "Junior Data Analyst at a 10-person D2C startup. You will clean sales data, write SQL queries, build weekly Excel dashboards and explain trends to the founders. Needs SQL, Excel, basic statistics and clear communication.",
  idea: 'A hyperlocal tiffin delivery app for college hostels in Delhi. Students order home-style meals from nearby home cooks, with weekly subscriptions and UPI payments. We need someone to build the first version and someone to handle cook onboarding.',
};

export default function Post() {
  useEffect(() => {
    document.title = 'ProveIt - Create a challenge';
  }, []);
  const navigate = useNavigate();
  const [mode, setMode] = useState('job');
  const [text, setText] = useState('');
  const [posterName, setPosterName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { challenge, ownerKey } = await api.generateChallenge({ mode, text, posterName });
      saveOwnerKey(challenge.id, ownerKey);
      navigate(`/review/${challenge.id}`);
    } catch (err) {
      setError(err.message || 'Could not generate the challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <h1>Create a challenge</h1>
        <p className="muted">Paste a job description or a business idea. AI drafts a real-world task and a scoring rubric. Nothing goes live without your approval.</p>
      </div>

      <div className="grid two">
        <button
          type="button"
          className="card"
          style={mode === 'job' ? { borderColor: 'var(--accent)', borderWidth: '2px' } : undefined}
          aria-pressed={mode === 'job'}
          disabled={loading}
          onClick={() => setMode('job')}
        >
          <h3>I'm hiring</h3>
          <span className="muted">Paste a job description. Candidates solve a real micro-task from the role.</span>
        </button>
        <button
          type="button"
          className="card"
          style={mode === 'idea' ? { borderColor: 'var(--accent)', borderWidth: '2px' } : undefined}
          aria-pressed={mode === 'idea'}
          disabled={loading}
          onClick={() => setMode('idea')}
        >
          <h3>I have an idea (Founder Mode)</h3>
          <span className="muted">Describe your idea. Find co-founders and early teammates who can deliver.</span>
        </button>
      </div>

      <form className="card stack" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="challenge-text">{mode === 'job' ? 'Paste the job description' : 'Describe your business idea'}</label>
          <textarea
            id="challenge-text"
            value={text}
            placeholder={mode === 'job' ? 'Paste the role, responsibilities, and skills you need...' : 'Describe the idea, who it serves, and what help you need...'}
            onChange={(event) => setText(event.target.value)}
            disabled={loading}
            required
          />
        </div>
        <div>
          <label htmlFor="poster-name">Your name or startup name (optional)</label>
          <input
            id="poster-name"
            type="text"
            value={posterName}
            onChange={(event) => setPosterName(event.target.value)}
            disabled={loading}
          />
        </div>
        <div className="row">
          <button className="btn ghost small" type="button" onClick={() => setText(examples[mode])} disabled={loading}>Use an example</button>
          <span className="muted small">{text.length} characters (minimum 30)</span>
        </div>
        {loading && <div className="notice"><span className="spinner" /> AI is designing your challenge (10-20 seconds)...</div>}
        {error && <div className="error" role="alert">{error}</div>}
        <div>
          <button className="btn primary" type="submit" disabled={loading || text.trim().length < 30}>Generate challenge with AI</button>
        </div>
      </form>

      <p className="muted small">Nothing goes live without your approval.</p>
    </div>
  );
}
