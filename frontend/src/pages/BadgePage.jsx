import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAsync } from '../lib/hooks.js';

export default function BadgePage() {
  const { badgeId } = useParams();
  const { data: badge, loading, error } = useAsync(() => api.getBadge(badgeId), [badgeId]);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const copyTimer = useRef(null);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyError('');
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setCopyError(err.message || 'Could not copy the link.');
    }
  }

  if (loading) return <div className="card center"><span className="spinner" /></div>;
  if (error || !badge) return (
    <div className="card">
      <h2>Badge not found</h2>
      <p className="muted">This ID could not be verified. It may be mistyped or fake.</p>
    </div>
  );

  const issueDate = new Date(badge.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const linkedinUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(`${badge.skill} (ProveIt)`)}&certId=${encodeURIComponent(badge.badgeId)}&certUrl=${encodeURIComponent(window.location.href)}`;

  return (
    <div className="stack">
      <section className="badge-card stack">
        <div>
          {badge.verified
            ? <span className="pill good">✔ VERIFIED BY PROVEIT</span>
            : <span className="pill bad">✖ NOT VERIFIED (signature mismatch)</span>}
        </div>
        <div>
          <h1>{badge.name}</h1>
          <h2>{badge.skill}</h2>
          <div className="row">
            <span className="pill info">{badge.level}</span>
            <span className="muted">Issued {issueDate}</span>
          </div>
        </div>
        <div className="score-big">{badge.total}<span className="muted small"> / 100</span></div>
        {badge.authenticity !== null && <p className="muted">Authenticity: {badge.authenticity}</p>}
        <p className="muted small">Challenge: {badge.challengeTitle}</p>
        {badge.mentor && <div className="quote"><strong>Mentor reviewed by {badge.mentor.name}</strong><br />{badge.mentor.note}</div>}
        <div className="row between">
          <div>
            <div className="muted small">Verification ID</div>
            <code style={{ fontFamily: 'monospace', fontSize: '1.15rem' }}>{badge.badgeId}</code>
          </div>
          <div className="center" style={{ background: '#fff', padding: 10, borderRadius: 12 }}>
            <QRCodeSVG value={window.location.href} size={120} bgColor="#ffffff" fgColor="#0b1020" />
            <div className="muted small">Scan to verify</div>
          </div>
        </div>
      </section>

      <section className="card stack">
        <h2>Why this score</h2>
        {!badge.breakdownPublic
          ? <p className="muted">The detailed score breakdown is private. The verified score and badge details remain public.</p>
          : (badge.criteria || []).map((criterion, index) => (
          <div className="stack" key={`${criterion.name}-${index}`}>
            <div className="row between"><strong>{criterion.name}</strong><strong>{criterion.points} / {criterion.weight}</strong></div>
            <div className="bar"><i style={{ width: `${criterion.weight ? (criterion.points / criterion.weight) * 100 : 0}%` }} /></div>
            <p className="muted small">{criterion.why}</p>
          </div>
        ))}
      </section>

      <div className="row">
        <button className="btn primary" type="button" onClick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
        <a className="btn ghost" href={linkedinUrl} target="_blank" rel="noreferrer">Add to LinkedIn</a>
      </div>
      {copyError && <div className="error" role="alert">{copyError}</div>}
      <p className="muted small">ProveIt badges are digitally signed. A changed score or name makes the verification fail.</p>
    </div>
  );
}
