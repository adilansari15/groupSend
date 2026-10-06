import React, { useState } from 'react';
import { useGroup } from '../context/GroupContext.jsx';
import { api } from '../api.js';
import { formatRupees } from '../utils/format.js';
import { Users, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Members() {
  const {
    activeGroup,
    balances,
    refreshActiveGroupData
  } = useGroup();

  const [newMemberName, setNewMemberName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!activeGroup) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p>Please select or create a group to view members.</p>
      </div>
    );
  }

  const members = activeGroup.members || [];
  const balanceMap = Object.fromEntries(balances.map((b) => [b.memberId, b.netBalance]));

  // Calculate sum of all net balances to verify the invariant (always 0)
  const sumBalances = Object.values(balanceMap).reduce((acc, v) => acc + v, 0);

  const handleAddMember = async (e) => {
    e.preventDefault();
    const trimmed = newMemberName.trim();
    if (!trimmed) {
      setError('Member name is required');
      return;
    }
    if (members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('A member with this name already exists');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await api.addMember(activeGroup._id, { name: trimmed });
      setNewMemberName('');
      await refreshActiveGroupData();
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

      {/* Add Member Card */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserPlus size={18} color="var(--primary)" /> Add new member
        </h3>

        {error && (
          <div style={{
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.84rem',
            marginBottom: '12px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '10px' }}>
          <input
            id="new-member-name-input"
            type="text"
            className="form-input"
            placeholder="Enter friend or roommate's name..."
            value={newMemberName}
            onChange={(e) => {
              setNewMemberName(e.target.value);
              if (error) setError('');
            }}
            style={{ maxWidth: '360px' }}
          />
          <button
            type="submit"
            id="submit-new-member-btn"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Adding...' : 'Add member'}
          </button>
        </form>
      </div>

      {/* Members Balance Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
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
                  <h4 style={{ fontSize: '0.96rem', color: 'var(--text-main)' }}>{m.name}</h4>
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
