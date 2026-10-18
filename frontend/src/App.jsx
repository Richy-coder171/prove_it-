import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Post from './pages/Post.jsx';
import Review from './pages/Review.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Solve from './pages/Solve.jsx';
import Result from './pages/Result.jsx';
import BadgePage from './pages/BadgePage.jsx';
import Feed from './pages/Feed.jsx';
import Login from './pages/Login.jsx';
import Profile from './pages/Profile.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import { useAuth } from './lib/auth.jsx';

export default function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    navigate('/');
  }

  return (
    <>
      <header className="nav" style={{ flexWrap: 'wrap' }}>
        <Link to="/" className="logo" aria-label="ProveIt home">Prove<span>It</span></Link>
        <nav aria-label="Main navigation">
          <NavLink to="/post">Post a challenge</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/feed">Opportunities</NavLink>
        </nav>
        <div className="row nav-account">
          {user ? <>
            <NavLink to="/profile">Profile</NavLink>
            <button className="btn small ghost" type="button" onClick={signOut}>Log out</button>
          </> : <NavLink to="/login">Log in</NavLink>}
        </div>
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
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<div className="card">Page not found.</div>} />
        </Routes>
      </main>
    </>
  );
}
