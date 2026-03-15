import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, getMe } from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('clear_token');
    if (token) {
      getMe().then(setUser).catch(() => localStorage.removeItem('clear_token')).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await apiLogin(email, password);
    localStorage.setItem('clear_token', res.token);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('clear_token');
    setUser(null);
  };

  if (loading) return null;
  return <AuthContext.Provider value={{ user, login, logout, isAuth: !!user }}>{children}</AuthContext.Provider>;
}
