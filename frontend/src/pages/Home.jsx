import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Anyone can get an AI to write an answer. ProveIt finds the people who can defend it.</h1>
        <p className="muted">Solve a real task, defend it out loud, and earn a verified badge that opens doors to jobs, co-founders and ventures.</p>
        <div className="row">
          <Link className="btn primary" to="/post">Post a challenge</Link>
          <Link className="btn ghost" to="/feed">See opportunities</Link>
        </div>
      </section>
      <div className="grid three">
        <div className="card"><h3>1. Solve</h3><p className="muted">A timed, real-world micro-task from the startup's actual work.</p></div>
        <div className="card"><h3>2. Defend</h3><p className="muted">AI asks 2-3 questions about YOUR answer. You reply by voice.</p></div>
        <div className="card"><h3>3. Get verified</h3><p className="muted">A signed badge anyone can check with a link or QR code.</p></div>
      </div>
      <h2>Who it serves</h2>
      <div className="grid two">
        <div className="card"><h3>Entrepreneurs</h3><p className="muted">Test ideas and find co-founders who can actually deliver.</p></div>
        <div className="card"><h3>Job seekers</h3><p className="muted">Prove skill without pedigree and build a portable profile.</p></div>
        <div className="card"><h3>Startups and recruiters</h3><p className="muted">A pre-ranked, explainable shortlist instead of a pile of resumes.</p></div>
        <div className="card"><h3>Mentors</h3><p className="muted">Review only the top few and endorse the best.</p></div>
      </div>
      <div className="card soft">
        <h3>Responsible AI</h3>
        <p>AI recommends, humans decide. Only the content of answers is scored, never face, accent or demographics. Candidates see their full breakdown and can request a human re-review.</p>
      </div>
    </>
  );
}
