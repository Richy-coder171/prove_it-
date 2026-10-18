import { createContext, useContext, useState } from 'react';
import { api } from './api.js';
import { clearAuth, getAuthUser, saveAuth } from './store.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getAuthUser());

  async function login(email, password) {
    const result = await api.login({ email, password });
    saveAuth(result.token, result.user);
    setUser(result.user);
    return result.user;
  }

  async function signup(body) {
    const result = await api.signup(body);
    saveAuth(result.token, result.user);
    setUser(result.user);
    return result.user;
  }

  async function logout() {
    try { await api.logout(); } catch { /* ignore expired or unavailable sessions */ }
    clearAuth();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, signup, logout, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
