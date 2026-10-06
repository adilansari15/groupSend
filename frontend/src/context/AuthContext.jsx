import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('groupspend_token'));
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register' | 'verify'
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    async function loadUser() {
      const savedToken = localStorage.getItem('groupspend_token');
      if (savedToken) {
        try {
          const res = await api.me();
          if (res?.user) {
            setUser(res.user);
          } else {
            localStorage.removeItem('groupspend_token');
            setToken(null);
          }
        } catch (_err) {
          localStorage.removeItem('groupspend_token');
          setToken(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.login({ email, password });
      if (res?.token) {
        localStorage.setItem('groupspend_token', res.token);
        setToken(res.token);
        setUser(res.user);
        setAuthModalOpen(false);
      }
      return res;
    } catch (err) {
      if (err.requiresVerification) {
        setPendingEmail(err.email || email);
        setAuthModalMode('verify');
      }
      throw err;
    }
  };

  const register = async (name, email, password) => {
    const res = await api.register({ name, email, password });
    // User must verify email before receiving token and accessing account
    setPendingEmail(email);
    setAuthModalMode('verify');
    return res;
  };

  const verifyEmail = async (data) => {
    const res = await api.verifyEmail(data);
    if (res?.token) {
      localStorage.setItem('groupspend_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setAuthModalOpen(false);
    }
    return res;
  };

  const resendVerification = async (email) => {
    return await api.resendVerification({ email });
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (_ignored) {}
    localStorage.removeItem('groupspend_token');
    setToken(null);
    setUser(null);
  };

  const openAuthModal = (mode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        verifyEmail,
        resendVerification,
        logout,
        authModalOpen,
        authModalMode,
        setAuthModalMode,
        pendingEmail,
        setPendingEmail,
        openAuthModal,
        closeAuthModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
