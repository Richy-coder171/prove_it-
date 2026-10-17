import { useCallback, useEffect, useRef, useState } from 'react';

export function useCountdown(deadlineISO) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const ms = deadlineISO ? Math.max(0, new Date(deadlineISO).getTime() - now) : 0;
  const s = Math.floor(ms / 1000);
  const label = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return { ms, label, expired: Boolean(deadlineISO) && ms === 0 };
}

export function useSpeech(lang = 'en-IN') {
  const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const supported = Boolean(SR);
  const recRef = useRef(null);
  const baseRef = useRef('');
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const start = useCallback(() => {
    if (!SR) return;
    setError('');
    const rec = new SR();
    rec.lang = lang; rec.continuous = true; rec.interimResults = true;
    baseRef.current = text ? text.trim() + ' ' : '';
    rec.onresult = (e) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setText(baseRef.current + t);
    };
    rec.onerror = (e) => { setError(e.error || 'speech error'); setListening(false); };
    rec.onend = () => setListening(false);
    recRef.current = rec; rec.start(); setListening(true);
  }, [SR, lang, text]);
  const stop = useCallback(() => recRef.current?.stop(), []);
  useEffect(() => () => recRef.current?.abort?.(), []);
  return { supported, listening, text, setText, start, stop, error };
}

export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    fn().then((data) => setState({ data, loading: false, error: '' }))
        .catch((e) => setState({ data: null, loading: false, error: e.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(load, [load]);
  return { ...state, reload: load };
}
