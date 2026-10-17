import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useSpeech } from '../lib/hooks.js';

const gradingMessages = [
  'Reading your answer...',
  'Checking the evidence...',
  'Running consistency checks...',
  'Writing your breakdown...',
];

export default function Defend({ submission, onDone }) {
  const questions = submission.questions || [];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(() => Array(questions.length).fill(''));
  const [pendingAnswers, setPendingAnswers] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [messageIndex, setMessageIndex] = useState(0);
  const speech = useSpeech();

  useEffect(() => {
    if (!submitting) return undefined;
    setMessageIndex(0);
    const timer = setInterval(() => setMessageIndex((current) => (current + 1) % gradingMessages.length), 3000);
    return () => clearInterval(timer);
  }, [submitting]);

  async function sendAnswers(allAnswers) {
    setPendingAnswers(allAnswers);
    setSubmitError('');
    setSubmitting(true);
    try {
      await api.defend(submission.id, allAnswers);
      onDone();
    } catch (error) {
      setSubmitError(error.message || 'Could not submit your answers. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    speech.stop();
    const nextAnswers = [...answers];
    nextAnswers[index] = speech.text;
    setAnswers(nextAnswers);
    speech.setText('');
    if (index === questions.length - 1) sendAnswers(nextAnswers);
    else setIndex(index + 1);
  }

  if (submitting) return (
    <div className="card center stack">
      <span className="spinner" />
      <p>{gradingMessages[messageIndex]}</p>
      <p className="muted">This takes up to 40 seconds.</p>
    </div>
  );

  if (submitError) return (
    <div className="card stack">
      <div className="error" role="alert">{submitError}</div>
      <div><button className="btn primary" type="button" onClick={() => sendAnswers(pendingAnswers)}>Try again</button></div>
    </div>
  );

  const lastQuestion = index === questions.length - 1;
  return (
    <div className="stack">
      <div>
        <h2>Now defend your answer</h2>
        <p className="muted">Answer each question in 30-60 seconds, in your own words. Only what you say is scored, never your accent or voice.</p>
      </div>
      <div className="stack">
        <div className="row between"><span>Question {index + 1} of {questions.length}</span><span className="muted small">{Math.round((index / questions.length) * 100)}%</span></div>
        <div className="bar"><i style={{ width: `${(index / questions.length) * 100}%` }} /></div>
        <div className="card"><h3>{questions[index]}</h3></div>
      </div>
      <div className="card stack">
        {speech.supported ? (
          <div className="center">
            <button className={`btn mic ${speech.listening ? 'on' : ''}`} type="button" aria-label={speech.listening ? 'Stop listening' : 'Start speaking'} onClick={() => speech.listening ? speech.stop() : speech.start()}>🎤</button>
            <p className="muted small">{speech.listening ? 'Listening... tap to stop' : 'Tap and speak'}</p>
          </div>
        ) : (
          <div className="notice">Voice is not supported in this browser. Type your answer below (Chrome works best for voice).</div>
        )}
        <label htmlFor="defend-answer">Your answer (you can edit what was heard)</label>
        <textarea id="defend-answer" value={speech.text} onChange={(event) => speech.setText(event.target.value)} />
        {speech.error && <p className="muted small">{speech.error}</p>}
        <div className="row">
          <button className="btn primary" type="button" onClick={next}>{lastQuestion ? 'Submit my answers' : 'Next question'}</button>
        </div>
      </div>
    </div>
  );
}
