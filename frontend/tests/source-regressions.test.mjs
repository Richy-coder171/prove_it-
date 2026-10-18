import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = async (name) => readFile(new URL(`../src/pages/${name}`, import.meta.url), 'utf8');

test('Feed animation receives an index and has safe data/empty/reduced-motion paths', async () => {
  const feed = await source('Feed.jsx');
  assert.match(feed, /challenges\.map\(\(challenge, index\)\s*=>/);
  assert.match(feed, /!challenges\?\.length/);
  assert.match(feed, /useReducedMotion/);
  assert.doesNotMatch(feed, /Feed - TODO/);
});

test('Profile and Leaderboard are connected to their backend contracts', async () => {
  const profile = await source('Profile.jsx');
  const leaderboard = await source('Leaderboard.jsx');
  assert.match(profile, /api\.me\(\)/);
  assert.match(profile, /api\.updateMe/);
  assert.match(profile, /Session expired/);
  assert.match(leaderboard, /api\.leaderboard/);
  assert.match(leaderboard, /row\.badgeId/);
  assert.doesNotMatch(profile, /TODO/);
  assert.doesNotMatch(leaderboard, /TODO/);
});

test('startup auth validation is represented in the provider and protected rendering waits', async () => {
  const auth = await readFile(new URL('../src/lib/auth.jsx', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(auth, /api\.me\(\)/);
  assert.match(auth, /error\.status === 401/);
  assert.match(app, /authLoading/);
});

test('role-aware registration and application routing protect the two workspaces', async () => {
  const login = await source('Login.jsx');
  const home = await source('Home.jsx');
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const roles = await readFile(new URL('../src/lib/roles.js', import.meta.url), 'utf8');
  assert.match(login, /I'm a Candidate/);
  assert.match(login, /I'm a Startup/);
  assert.match(login, /if \(mode === 'signup' && !role\)/);
  assert.match(login, /role, showOnLeaderboard/);
  assert.doesNotMatch(home, /to="\/post"/);
  assert.doesNotMatch(home, /to="\/feed"/);
  assert.match(home, /<Login \/>/);
  assert.match(app, /ProtectedRoute roles=\{\['startup'\]\}/);
  assert.match(app, /ProtectedRoute roles=\{\['candidate'\]\}/);
  assert.match(roles, /startup.*dashboard/);
});
