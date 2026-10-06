import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useGroup } from '../context/GroupContext.jsx';
import { Users2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function JoinGroup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();
  const { fetchGroups, setActiveGroup } = useGroup();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guestName, setGuestName] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function loadGroup() {
      try {
        setLoading(true);
        const data = await api.getGroup(id);
        setGroup(data);
      } catch (err) {
        setError(err.message || 'Group not found');
      } finally {
        setLoading(false);
      }
    }
    loadGroup();
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        Loading group invitation...
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="card" style={{ maxWidth: '440px', margin: '60px auto', textAlign: 'center', padding: '36px 24px' }}>
        <AlertCircle size={40} color="var(--danger)" style={{ marginBottom: '12px' }} />
        <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Invitation invalid</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
          {error || 'This group could not be found or has been removed.'}
        </p>
        <button onClick={() => navigate('/')} className="btn btn-secondary">
          Go to home
        </button>
      </div>
    );
  }

  const isAlreadyMember = user && group.members.some(
    (m) => String(m.userId) === String(user.id) || m.name.toLowerCase() === user.name.toLowerCase()
  );

  const handleJoin = async (e) => {
    e?.preventDefault();
    const nameToUse = user ? user.name : guestName.trim();
    if (!nameToUse) {
      setError('Please provide your name to join');
      return;
    }

    try {
      setJoining(true);
      setError('');
      const res = await api.joinGroup(group._id, { name: nameToUse });
      await fetchGroups();
      setActiveGroup(res.group || group);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '40px auto', padding: '0 16px' }}>
      <div className="card" style={{ padding: '32px 24px', textAlign: 'center' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #1f8a7a 0%, #176f62 100%)',
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          boxShadow: '0 6px 16px var(--primary-glow)'
        }}>
          <Users2 size={28} />
        </div>

        <h2 style={{ fontSize: '1.45rem', color: 'var(--text-main)', marginBottom: '6px' }}>
          Join {group.name}
        </h2>
        {group.description && (
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
            {group.description}
          </p>
        )}

        <div style={{
          background: 'var(--bg)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          marginBottom: '20px',
          border: '1px solid var(--border)'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Current members ({group.members?.length || 0}):
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginTop: '6px' }}>
            {group.members.map((m) => (
              <span key={m._id} className="badge badge-teal" style={{ fontSize: '0.76rem' }}>
                {m.name}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {isAlreadyMember ? (
          <div>
            <div style={{
              background: 'var(--success-light)',
              color: 'var(--success)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
              fontWeight: '600',
              marginBottom: '16px'
            }}>
              You are already a member of this group!
            </div>
            <button
              onClick={() => {
                setActiveGroup(group);
                navigate('/');
              }}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Open group
            </button>
          </div>
        ) : user ? (
          <div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Logged in as <strong>{user.name}</strong> ({user.email})
            </p>
            <button
              id="confirm-join-btn"
              onClick={handleJoin}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
              disabled={joining}
            >
              {joining ? 'Joining...' : 'Join this group'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label" htmlFor="guest-join-name">Your name</label>
              <input
                id="guest-join-name"
                className="form-input"
                type="text"
                placeholder="Enter your name to join"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
              disabled={joining}
            >
              {joining ? 'Joining...' : 'Join as member'}
            </button>
            <div style={{ margin: '8px 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>or</div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => openAuthModal('login')}
            >
              Log in to your account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
