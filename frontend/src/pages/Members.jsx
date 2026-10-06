import React, { useState, useEffect, useRef } from 'react';
import { useGroup } from '../context/GroupContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { formatRupees } from '../utils/format.js';
import { Users, UserPlus, CheckCircle2, AlertCircle, Search, ShieldCheck, Loader2 } from 'lucide-react';

export default function Members() {
  const {
    activeGroup,
    balances,
    refreshActiveGroupData
  } = useGroup();

  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const searchTimeoutRef = useRef(null);

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

  if (!activeGroup) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p>Please select or create a group to view members.</p>
      </div>
    );
  }

  const members = activeGroup.members || [];
  const balanceMap = Object.fromEntries(balances.map((b) => [b.memberId, b.netBalance]));
  const sumBalances = Object.values(balanceMap).reduce((acc, v) => acc + v, 0);

  const handleAddMember = async (candidate) => {
    setError('');
    setSuccessMsg('');

    // Check if already in group
    const alreadyInGroup = members.some(
      (m) => String(m.userId) === String(candidate.id) || m.email?.toLowerCase() === candidate.email?.toLowerCase()
    );

    if (alreadyInGroup) {
      setError(`"${candidate.name}" is already a member of this group`);
      return;
    }

    try {
      setSubmitting(true);
      await api.addMember(activeGroup._id, {
        userId: candidate.id || candidate._id,
        email: candidate.email
      });

      setSuccessMsg(`Added "${candidate.name}" to group`);
      setSearchQuery('');
      setSearchResults([]);
      await refreshActiveGroupData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={22} color="var(--primary)" /> Group members
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {members.length} member{members.length !== 1 ? 's' : ''} in {activeGroup.name}
          </span>
        </div>

        {/* Zero-sum invariant status badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.82rem'
        }}>
          <CheckCircle2 size={16} color="var(--success)" />
          <span style={{ color: 'var(--text-muted)' }}>Net balance balance:</span>
          <strong className="amount-text">{formatRupees(sumBalances)}</strong>
        </div>
      </div>

      {/* Add Member Card with Search */}
      <div className="card" style={{ padding: '18px 20px', position: 'relative' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserPlus size={18} color="var(--primary)" /> Add verified member
        </h3>

        {error && (
          <div style={{
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.84rem',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.84rem',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <div style={{ position: 'relative', maxWidth: '440px' }}>
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            id="search-add-member-input"
            type="text"
            className="form-input"
            placeholder="Search registered & verified user by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={submitting}
            style={{ paddingLeft: '36px', paddingRight: searching ? '36px' : '12px' }}
          />
          {searching && (
            <Loader2 size={16} className="spin-icon" color="var(--primary)" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          )}

          {/* Search Results Dropdown */}
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
              maxHeight: '220px',
              overflowY: 'auto',
              zIndex: 10
            }}>
              {searchResults.length === 0 && !searching ? (
                <div style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No verified user found matching "{searchQuery}". Users must register and verify email first.
                </div>
              ) : (
                searchResults.map((candidate) => {
                  const alreadyMember = members.some(
                    (m) => String(m.userId) === String(candidate.id) || m.email?.toLowerCase() === candidate.email?.toLowerCase()
                  );

                  return (
                    <div
                      key={candidate.id}
                      onClick={() => !alreadyMember && handleAddMember(candidate)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        cursor: alreadyMember ? 'default' : 'pointer',
                        opacity: alreadyMember ? 0.6 : 1,
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!alreadyMember) e.currentTarget.style.background = 'var(--surface-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!alreadyMember) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '0.85rem'
                        }}>
                          {candidate.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>
                            {candidate.name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {candidate.email}
                          </div>
                        </div>
                      </div>

                      {alreadyMember ? (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Already member</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          Add to group
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Members Balance Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
        {members.map((m) => {
          const net = balanceMap[String(m._id)] || 0;
          const isCreditor = net > 0;
          const isDebtor = net < 0;

          return (
            <div
              key={m._id}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 18px',
                borderLeft: `4px solid ${isCreditor ? 'var(--success)' : isDebtor ? 'var(--danger)' : 'var(--border)'}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: isCreditor ? 'var(--success-light)' : isDebtor ? 'var(--danger-light)' : 'var(--surface-hover)',
                  color: isCreditor ? 'var(--success)' : isDebtor ? 'var(--danger)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '1rem'
                }}>
                  {m.name[0]?.toUpperCase()}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.96rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    {m.name}
                    <ShieldCheck size={14} color="var(--primary)" title="Verified user" />
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {isCreditor ? 'Gets back' : isDebtor ? 'Owes group' : 'Settled up'}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span
                  className={`amount-text ${isCreditor ? 'amount-positive' : isDebtor ? 'amount-negative' : 'amount-zero'}`}
                  style={{ fontSize: '1.15rem' }}
                >
                  {isCreditor ? `+${formatRupees(net)}` : formatRupees(net)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
