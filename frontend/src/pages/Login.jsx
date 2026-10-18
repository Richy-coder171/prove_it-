import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { postLoginDestination, roleLabel } from '../lib/roles.js';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export default function Login({ initialMode = 'login' }) {
  const { user, login, signup } = useAuth();
  const reduceMotion = useReducedMotion();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(false);
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = mode === 'signup' ? 'ProveIt - Create account' : 'ProveIt - Log in'; }, [mode]);

  if (user) return <Navigate to={postLoginDestination(user)} replace />;

  async function submit(event) {
    event.preventDefault();
    setError('');
    const normalizedEmail = email.trim();
    if (mode === 'signup' && name.trim().length < 2) return setError('Name must be at least 2 characters.');
    if (mode === 'signup' && !role) return setError('Choose whether you are a candidate or a startup.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');

    setBusy(true);
    try {
      const authenticatedUser = mode === 'signup'
        ? await signup({ name: name.trim(), email: normalizedEmail, password, role, showOnLeaderboard })
        : await login(normalizedEmail, password);
      const next = new URLSearchParams(location.search).get('next');
      navigate(postLoginDestination(authenticatedUser, next), { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Could not authenticate. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <motion.section
        className="card stack"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
      >
        <div className="row">
          <button className={`btn ${mode === 'login' ? 'primary' : 'ghost'}`} type="button" disabled={busy} aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setError(''); }}>Log in</button>
          <button className={`btn ${mode === 'signup' ? 'primary' : 'ghost'}`} type="button" disabled={busy} aria-pressed={mode === 'signup'} onClick={() => { setMode('signup'); setError(''); }}>Create account</button>
        </div>
        <div>
          <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="muted">{mode === 'login' ? 'Sign in to continue to your ProveIt workspace.' : 'Choose your workspace, then build a profile for the work ahead.'}</p>
        </div>
        <form className="stack" onSubmit={submit} noValidate>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              className="stack"
              initial={reduceMotion ? false : { opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
              transition={{ duration: reduceMotion ? 0 : 0.16, ease: 'easeOut' }}
            >
              {mode === 'signup' && <div><label htmlFor="auth-name">Name</label><input id="auth-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} /></div>}
              {mode === 'signup' && <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{ marginBottom: 7, fontWeight: 680 }}>Choose your account type</legend>
                <div className="grid two" role="group" aria-label="Account type">
                  <button className="card soft" type="button" aria-pressed={role === 'candidate'} disabled={busy} onClick={() => { setRole('candidate'); setError(''); }}>
                    <strong>I'm a Candidate</strong>
                    <span className="muted small" style={{ display: 'block', marginTop: 7 }}>I want to prove my skills, discover opportunities, complete challenges, and get hired.</span>
                  </button>
                  <button className="card soft" type="button" aria-pressed={role === 'startup'} disabled={busy} onClick={() => { setRole('startup'); setError(''); }}>
                    <strong>I'm a Startup</strong>
                    <span className="muted small" style={{ display: 'block', marginTop: 7 }}>I want to create skill challenges, evaluate candidates, and find the right people for my startup.</span>
                  </button>
                </div>
                <div className="muted small" aria-live="polite">{role ? `Selected workspace: ${roleLabel({ role })}` : 'Select one workspace to continue.'}</div>
              </fieldset>}
              <div><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
              <div>
                <label htmlFor="auth-password">Password</label>
                <input id="auth-password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
                {mode === 'signup' && <div className="muted small">At least 8 characters</div>}
              </div>
              {mode === 'signup' && role === 'candidate' && <div>
                <label className="row small" htmlFor="auth-leaderboard" style={{ alignItems: 'flex-start' }}>
                  <input id="auth-leaderboard" type="checkbox" checked={showOnLeaderboard} onChange={(event) => setShowOnLeaderboard(event.target.checked)} style={{ width: 'auto', minHeight: 0, marginTop: 4 }} />
                  <span>Show my supported badge information on the public leaderboard</span>
                </label>
                <div className="muted small">If enabled, your name, skill, score, level, and mentor name for qualifying badges may be displayed publicly. You can change this any time in your profile.</div>
              </div>}
            </motion.div>
          </AnimatePresence>
          {error && <div className="error" role="alert">{error}</div>}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? <><span className="spinner" /> {mode === 'signup' ? 'Creating account...' : 'Signing in...'}</> : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>
      </motion.section>
    </div>
  );
}
