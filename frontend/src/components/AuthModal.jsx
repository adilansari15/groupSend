import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useGroup } from '../context/GroupContext.jsx';
import { X, Lock, Mail, User, LogIn, UserPlus, AlertCircle, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';

export default function AuthModal() {
  const {
    authModalOpen,
    authModalMode,
    setAuthModalMode,
    closeAuthModal,
    login,
    register,
    verifyEmail,
    resendVerification,
    pendingEmail,
    user
  } = useAuth();

  const { fetchGroups } = useGroup();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (authModalOpen) {
      setError('');
      setSuccessMsg('');
      setPassword('');
      setCode('');
    }
  }, [authModalOpen, authModalMode]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && authModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authModalOpen, closeAuthModal]);

  if (!authModalOpen) return null;

  const isVerify = authModalMode === 'verify';
  const isLogin = authModalMode === 'login';
  const targetEmail = pendingEmail || user?.email || email;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (isVerify) {
      if (!code.trim() || code.trim().length !== 6) {
        setError('Please enter the 6-digit verification code');
        return;
      }
      try {
        setSubmitting(true);
        await verifyEmail({
          email: targetEmail,
          code: code.trim()
        });
        await fetchGroups();
        setSuccessMsg('Email verified successfully! Logging you in...');
        setTimeout(() => {
          closeAuthModal();
        }, 1200);
      } catch (err) {
        setError(err.message || 'Verification failed');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }

    if (!isLogin && !name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setSubmitting(true);
      if (isLogin) {
        await login(email.trim(), password);
        await fetchGroups();
      } else {
        await register(name.trim(), email.trim(), password);
        // User is switched to 'verify' mode in modal
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!targetEmail) {
      setError('No email address available to resend verification.');
      return;
    }
    try {
      setResending(true);
      setError('');
      setSuccessMsg('');
      await resendVerification(targetEmail);
      setSuccessMsg('A new verification code has been sent!');
    } catch (err) {
      setError(err.message || 'Failed to resend verification code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={closeAuthModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '440px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.3rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isVerify ? (
              <ShieldCheck size={22} color="var(--primary)" />
            ) : isLogin ? (
              <LogIn size={22} color="var(--primary)" />
            ) : (
              <UserPlus size={22} color="var(--primary)" />
            )}
            {isVerify ? 'Verify your email' : isLogin ? 'Log in to GroupSpend' : 'Create an account'}
          </h2>
          <button
            onClick={closeAuthModal}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switch (only if not in verify mode) */}
        {!isVerify ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            background: 'var(--bg)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              className={`btn btn-sm ${isLogin ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAuthModalMode('login')}
              style={{ border: 'none' }}
            >
              Log in
            </button>
            <button
              type="button"
              className={`btn btn-sm ${!isLogin ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAuthModalMode('register')}
              style={{ border: 'none' }}
            >
              Sign up
            </button>
          </div>
        ) : (
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: 1.5 }}>
            We've sent a 6-digit verification code to <strong style={{ color: 'var(--text-main)' }}>{targetEmail}</strong>.
            Please check your inbox (and spam folder).
          </p>
        )}

        {error && (
          <div style={{
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {isVerify ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="verification-code-input">
                6-digit verification code
              </label>
              <input
                id="verification-code-input"
                className="form-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                style={{
                  textAlign: 'center',
                  fontSize: '1.4rem',
                  letterSpacing: '6px',
                  fontWeight: '700',
                  padding: '10px'
                }}
                autoFocus
              />
            </div>

            <button
              type="submit"
              id="verify-code-btn"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px', padding: '12px' }}
              disabled={submitting || code.length !== 6}
            >
              {submitting ? 'Verifying...' : 'Verify email'}
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '16px',
              fontSize: '0.84rem'
            }}>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: 0
                }}
              >
                <RefreshCw size={14} className={resending ? 'spin-icon' : ''} />
                {resending ? 'Sending...' : 'Resend code'}
              </button>

              <button
                type="button"
                onClick={closeAuthModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                I'll verify later
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label" htmlFor="auth-name-input">Full name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="auth-name-input"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Mohammad Adil"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="auth-email-input">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="auth-email-input"
                  className="form-input"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '36px' }}
                  autoFocus={isLogin}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="auth-password-input">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="auth-password-input"
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              id="auth-submit-btn"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px', padding: '12px' }}
              disabled={submitting}
            >
              {submitting ? 'Processing...' : isLogin ? 'Log in' : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
