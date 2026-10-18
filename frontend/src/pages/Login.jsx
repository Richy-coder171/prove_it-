import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export default function Login() {
  const { user, login, signup } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = 'ProveIt - Log in'; }, []);

  if (user) return <Navigate to="/profile" replace />;

  async function submit(event) {
    event.preventDefault();
    setError('');
    const normalizedEmail = email.trim();
    if (mode === 'signup' && name.trim().length < 2) return setError('Name must be at least 2 characters.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');

    setBusy(true);
    try {
      if (mode === 'signup') await signup({ name: name.trim(), email: normalizedEmail, password, showOnLeaderboard });
      else await login(normalizedEmail, password);
      const next = new URLSearchParams(location.search).get('next');
      navigate(next?.startsWith('/') ? next : '/profile', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Could not authenticate. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <section className="card stack">
        <div className="row">
          <button className={`btn ${mode === 'login' ? 'primary' : 'ghost'}`} type="button" aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setError(''); }}>Log in</button>
          <button className={`btn ${mode === 'signup' ? 'primary' : 'ghost'}`} type="button" aria-pressed={mode === 'signup'} onClick={() => { setMode('signup'); setError(''); }}>Sign up</button>
        </div>
        <div>
          <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="muted">{mode === 'login' ? 'Sign in to keep your verified work together.' : 'Build a profile for your challenge attempts and verified badges.'}</p>
        </div>
        <form className="stack" onSubmit={submit} noValidate>
          {mode === 'signup' && <div><label htmlFor="auth-name">Name</label><input id="auth-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} /></div>}
          <div><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
          <div>
            <label htmlFor="auth-password">Password</label>
            <input id="auth-password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
            {mode === 'signup' && <div className="muted small">At least 8 characters</div>}
          </div>
          {mode === 'signup' && <div>
            <label className="row small" htmlFor="auth-leaderboard" style={{ alignItems: 'flex-start' }}>
              <input id="auth-leaderboard" type="checkbox" checked={showOnLeaderboard} onChange={(event) => setShowOnLeaderboard(event.target.checked)} style={{ width: 'auto', minHeight: 0, marginTop: 4 }} />
              <span>Show my verified badges on the public leaderboard</span>
            </label>
            <div className="muted small">You can change this any time in your profile.</div>
          </div>}
          {error && <div className="error" role="alert">{error}</div>}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? <><span className="spinner" /> {mode === 'signup' ? 'Creating account...' : 'Signing in...'}</> : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>
      </section>
    </div>
  );
}
