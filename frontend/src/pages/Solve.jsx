import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { getSession, saveSession } from '../lib/store.js';
import { useCountdown } from '../lib/hooks.js';
import Defend from '../components/Defend.jsx';

export default function Solve() {
  const { id } = useParams();
  const navigate = useNavigate();
  const retry = new URLSearchParams(window.location.search).get('retry') === '1';
  const [step, setStep] = useState('loading');
  const [challenge, setChallenge] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const { label, ms, expired } = useCountdown(submission?.deadline);

  useEffect(() => {
    let active = true;
    async function load() {
      setStep('loading');
      setError('');
      setChallenge(null);
      setSubmission(null);
      try {
        const item = await api.getChallenge(id);
        if (!active) return;
        setChallenge(item);
        const session = !retry && getSession(id);
        if (!session) {
          setStep('intro');
          return;
        }
        setName(session.name || '');
        setEmail(session.email || '');
        try {
          const savedSubmission = await api.getSubmission(session.sid);
          if (!active) return;
          setSubmission(savedSubmission);
          if (savedSubmission.status === 'started') setStep('answer');
          else if (savedSubmission.status === 'answered') setStep('defend');
          else if (savedSubmission.status === 'graded') navigate(`/result/${session.sid}`, { replace: true });
          else setStep('intro');
        } catch (resumeError) {
          if (!active) return;
          setError(resumeError.message || 'Could not resume your submission.');
          setStep('intro');
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || 'The challenge could not be loaded.');
        setStep('error');
      }
    }
    load();
    return () => { active = false; };
  }, [id, navigate, retry]);

  async function start(event) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const started = await api.start(id, { name, email, retry });
      saveSession(id, { sid: started.id, name, email });
      setSubmission(started);
      setAnswer('');
      setStep('answer');
      if (retry) navigate(`/c/${id}`, { replace: true });
    } catch (startError) {
      setError(startError.message || 'Could not start this challenge.');
    } finally {
      setSending(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const answered = await api.submitAnswer(submission.id, answer);
      setSubmission(answered);
      setStep('defend');
    } catch (submitError) {
      setError(submitError.message || 'Could not submit your answer.');
    } finally {
      setSending(false);
    }
  }

  if (step === 'loading') return <div className="card center"><span className="spinner" /></div>;
  if (step === 'error') return <div className="card"><div className="error" role="alert"><p>{error}</p><p>This challenge is not available.</p></div></div>;
  if (step === 'defend') return <Defend submission={submission} onDone={() => navigate(`/result/${submission.id}`)} />;

  if (step === 'intro') return (
    <div className="stack">
      <div>
        <h1>{challenge.title}</h1>
        <div className="row">
          <span className="pill info">{challenge.skill}</span>
          <span className="pill info">{challenge.level}</span>
          <span className="pill warn">{challenge.timeLimitMin} minutes</span>
        </div>
      </div>
      <div className="card" style={{ whiteSpace: 'pre-wrap' }}>{challenge.task}</div>
      <div className="card stack">
        <h2>How you are scored</h2>
        {(challenge.rubric || []).map((item, index) => <div key={`${item.name}-${index}`}><strong>{item.name} ({item.weight}%)</strong><div className="muted">{item.description}</div></div>)}
      </div>
      <div className="notice">You will answer a timed task, then defend your answer out loud. Longer answers do not earn more points.</div>
      <form className="card stack" onSubmit={start}>
        <h2>Start this challenge</h2>
        <div><label htmlFor="candidate-name">Your name</label><input id="candidate-name" value={name} onChange={(event) => setName(event.target.value)} required /></div>
        <div><label htmlFor="candidate-email">Email</label><input id="candidate-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
        {error && <div className="error" role="alert">{error}</div>}
        <div className="row">
          <button className="btn primary" type="submit" disabled={sending}>{sending ? <><span className="spinner" /> Starting...</> : 'Start the timer'}</button>
        </div>
      </form>
    </div>
  );

  if (step === 'answer') return (
    <div className="stack">
      <div className="row between card">
        <h2>{challenge.title}</h2>
        <div className={`timer ${ms < 300000 ? 'low' : ''}`}>{label}</div>
      </div>
      <details className="card" open>
        <summary>Task</summary>
        <div style={{ whiteSpace: 'pre-wrap' }}>{challenge.task}</div>
      </details>
      <form className="card stack" onSubmit={submit}>
        <label htmlFor="candidate-answer">Your answer</label>
        <textarea id="candidate-answer" className="code" value={answer} onChange={(event) => setAnswer(event.target.value)} minLength={20} required />
        <p className="muted small">Longer answers do not earn more points.</p>
        {expired && <div className="notice">Time is up. You can still submit, but it will be marked late.</div>}
        {error && <div className="error" role="alert">{error}</div>}
        <div className="row">
          <button className="btn primary" type="submit" disabled={sending || answer.trim().length < 20}>{sending ? <><span className="spinner" /> AI is reading your answer and preparing your questions (5-15 seconds)...</> : 'Submit and continue to defend'}</button>
        </div>
      </form>
    </div>
  );

  return null;
}
