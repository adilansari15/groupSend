import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { CheckCircle2, AlertCircle, Loader2, Mail, ArrowRight } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail, resendVerification, user } = useAuth();

  const token = searchParams.get('token');
  const emailParam = searchParams.get('email') || user?.email || '';

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function handleVerification() {
      if (!token) {
        setStatus('error');
        setErrorMessage('No verification token found in URL.');
        return;
      }

      try {
        await verifyEmail({ token });
        if (isMounted) {
          setStatus('success');
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err.message || 'Verification link is invalid or expired.');
        }
      }
    }

    handleVerification();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async () => {
    if (!emailParam) {
      setErrorMessage('Please log in or provide an email to resend verification.');
      return;
    }

    try {
      setResending(true);
      setResendStatus('');
      await resendVerification(emailParam);
      setResendStatus('A new verification email has been sent!');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      maxWidth: '520px',
      margin: '60px auto',
      padding: '36px 28px',
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-md)',
      textAlign: 'center'
    }}>
      {status === 'verifying' && (
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            marginBottom: '20px'
          }}>
            <Loader2 size={32} color="var(--primary)" className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', marginBottom: '8px' }}>
            Verifying your email...
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Please wait while we confirm your email address.
          </p>
        </div>
      )}

      {status === 'success' && (
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            marginBottom: '20px'
          }}>
            <CheckCircle2 size={36} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', marginBottom: '8px' }}>
            Email verified successfully!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Your account is now fully verified. You can access all groups and expenses.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
          >
            Go to dashboard <ArrowRight size={16} />
          </button>
        </div>
      )}

      {status === 'error' && (
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--danger-light)',
            marginBottom: '20px'
          }}>
            <AlertCircle size={36} color="var(--danger)" />
          </div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', marginBottom: '8px' }}>
            Verification failed
          </h2>
          <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '20px' }}>
            {errorMessage}
          </p>

          {resendStatus && (
            <div style={{
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '16px'
            }}>
              {resendStatus}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {emailParam && (
              <button
                onClick={handleResend}
                className="btn btn-secondary"
                disabled={resending}
                style={{ width: '100%', padding: '10px' }}
              >
                <Mail size={16} /> {resending ? 'Sending...' : 'Resend verification email'}
              </button>
            )}
            <Link to="/" className="btn btn-outline" style={{ width: '100%', padding: '10px' }}>
              Return to home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
