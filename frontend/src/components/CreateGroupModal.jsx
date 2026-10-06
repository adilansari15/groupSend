import React, { useState, useEffect, useRef } from 'react';
import { useGroup } from '../context/GroupContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { X, Search, Users, ShieldCheck, UserCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function CreateGroupModal() {
  const {
    createGroupModalOpen,
    setCreateGroupModalOpen,
    fetchGroups,
    setActiveGroup
  } = useGroup();

  const { user, openAuthModal } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && createGroupModalOpen) {
        setCreateGroupModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createGroupModalOpen, setCreateGroupModalOpen]);

  // Live search debouncing
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await api.searchUsers(searchQuery.trim());
        setSearchResults(results || []);
      } catch (_err) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  if (!createGroupModalOpen) return null;

  const handleSelectUser = (candidate) => {
    setError('');

    // Prevent adding self
    if (user && (candidate.id === user.id || candidate.email.toLowerCase() === user.email.toLowerCase())) {
      setError('You are automatically included as the group creator');
      return;
    }

    // Prevent duplicates
    if (selectedMembers.some((m) => m.id === candidate.id || m.email.toLowerCase() === candidate.email.toLowerCase())) {
      setError(`"${candidate.name}" is already selected`);
      return;
    }

    setSelectedMembers([...selectedMembers, candidate]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveMember = (candidateId) => {
    setSelectedMembers(selectedMembers.filter((m) => m.id !== candidateId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to create a group');
      return;
    }

    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    if (selectedMembers.length < 1) {
      setError('Select at least 1 other registered & verified user to share expenses');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const newGroup = await api.createGroup({
        name: name.trim(),
        description: description.trim(),
        members: selectedMembers.map((m) => ({
          userId: m.id || m._id,
          email: m.email,
          name: m.name
        }))
      });

      await fetchGroups();
      setActiveGroup(newGroup);
      setCreateGroupModalOpen(false);
      setName('');
      setDescription('');
      setSelectedMembers([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setCreateGroupModalOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '500px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h2 style={{ fontSize: '1.28rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="var(--primary)" /> Create new group
          </h2>
          <button
            onClick={() => setCreateGroupModalOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {!user && (
          <div style={{
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.86rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>Please log in to create a group.</span>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                setCreateGroupModalOpen(false);
                openAuthModal('login');
              }}
            >
              Log in
            </button>
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '16px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="group-name-input">
              Group name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="group-name-input"
              className="form-input"
              type="text"
              placeholder="e.g. Goa Trip, Flat 402"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="group-desc-input">Description (optional)</label>
            <input
              id="group-desc-input"
              className="form-input"
              type="text"
              placeholder="e.g. Shared trip expenses"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Member Search Flow */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">
              Add verified members <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                id="member-search-input"
                className="form-input"
                type="text"
                placeholder="Search registered user by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', paddingRight: searching ? '36px' : '12px' }}
              />
              {searching && (
                <Loader2 size={16} className="spin-icon" color="var(--primary)" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {searchQuery.trim().length >= 2 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                marginTop: '4px',
                maxHeight: '180px',
                overflowY: 'auto',
                zIndex: 10
              }}>
                {searchResults.length === 0 && !searching ? (
                  <div style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No verified users found matching "{searchQuery}"
                  </div>
                ) : (
                  searchResults.map((candidate) => (
                    <div
                      key={candidate.id}
                      onClick={() => handleSelectUser(candidate)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '0.8rem'
                        }}>
                          {candidate.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-main)' }}>
                            {candidate.name}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            {candidate.email}
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-teal" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldCheck size={12} /> Verified
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Members chips */}
          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
              Group members ({1 + selectedMembers.length})
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {/* Creator Chip */}
              {user && (
                <span className="badge badge-purple" style={{ padding: '6px 12px', fontSize: '0.82rem', gap: '6px' }}>
                  <UserCheck size={14} /> {user.name} (You - Creator)
                </span>
              )}

              {/* Selected Additional Members */}
              {selectedMembers.map((m) => (
                <span
                  key={m.id}
                  className="badge badge-teal"
                  style={{ padding: '6px 12px', fontSize: '0.82rem', gap: '8px' }}
                >
                  <span>{m.name} <span style={{ opacity: 0.8, fontSize: '0.74rem' }}>({m.email})</span></span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex' }}
                    title={`Remove ${m.name}`}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCreateGroupModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-group-btn"
              className="btn btn-primary"
              disabled={submitting || !user}
            >
              {submitting ? 'Creating...' : 'Create group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
