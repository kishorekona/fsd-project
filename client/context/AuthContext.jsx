import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const TOKEN_KEY = 'learnhub-session-token';

export const api = axios.create({ baseURL: '/api', headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
      return;
    }
    api.get('/auth/me').then(({ data }) => setUser(data.user)).catch(() => signOut()).finally(() => setLoading(false));
  }, [signOut]);

  const signIn = useCallback(async (credentials, endpoint = '/auth/login') => {
    const { data } = await api.post(endpoint, credentials);
    sessionStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}