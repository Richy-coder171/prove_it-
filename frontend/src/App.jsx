import { Link, NavLink, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Post from './pages/Post.jsx';
import Review from './pages/Review.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Solve from './pages/Solve.jsx';
import Result from './pages/Result.jsx';
import BadgePage from './pages/BadgePage.jsx';
import Feed from './pages/Feed.jsx';

export default function App() {
  return (
    <>
      <header className="nav">
        <Link to="/" className="logo" aria-label="ProveIt home">Prove<span>It</span></Link>
        <nav aria-label="Main navigation">
          <NavLink to="/post">Post a challenge</NavLink>
          <NavLink to="/feed">Opportunities</NavLink>
        </nav>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/post" element={<Post />} />
          <Route path="/review/:id" element={<Review />} />
          <Route path="/dashboard/:id" element={<Dashboard />} />
          <Route path="/c/:id" element={<Solve />} />
          <Route path="/result/:sid" element={<Result />} />
          <Route path="/badge/:badgeId" element={<BadgePage />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="*" element={<div className="card">Page not found.</div>} />
        </Routes>
      </main>
    </>
  );
}
