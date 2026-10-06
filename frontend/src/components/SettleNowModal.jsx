import React, { useState, useEffect } from 'react';
import { useGroup } from '../context/GroupContext.jsx';
import { api } from '../api.js';
import { formatRupees, rupeesToPaise } from '../utils/format.js';
import { X, ArrowRightLeft, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export default function SettleNowModal() {
  const {
    activeGroup,
    settleModalOpen,
    settlePrefill,
    closeSettleModal,
    refreshActiveGroupData
  } = useGroup();

  const members = activeGroup?.members || [];
  const memberNameMap = Object.fromEntries(members.map((m) => [String(m._id), m.name]));

  const [fromMemberId, setFromMemberId] = useState('');
  const [toMemberId, setToMemberId] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (settleModalOpen) {
      if (settlePrefill) {
        setFromMemberId(settlePrefill.from || '');
        setToMemberId(settlePrefill.to || '');
        setAmountRupees((settlePrefill.amount / 100).toFixed(2));
      } else if (members.length >= 2) {
        setFromMemberId(String(members[0]._id));
        setToMemberId(String(members[1]._id));
        setAmountRupees('');
      }
      setNote('');
      setError('');
    }
  }, [settleModalOpen, settlePrefill, members]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && settleModalOpen) {
        closeSettleModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settleModalOpen, closeSettleModal]);

  if (!settleModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromMemberId || !toMemberId) {
      setError('Please select both payer and receiver');
      return;
    }
    if (fromMemberId === toMemberId) {
      setError('Payer and receiver cannot be the same member');
      return;
    }
    const paise = rupeesToPaise(amountRupees);
    if (!paise || paise <= 0) {
      setError('Please enter a valid settlement amount');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      // Request settlement with peer-review requirement
      await api.createSettlementRequest(activeGroup._id, {
        from: fromMemberId,
        to: toMemberId,
        amount: paise,
        note: note.trim()
      });

      await refreshActiveGroupData();
      closeSettleModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={closeSettleModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '460px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowRightLeft size={20} color="var(--primary)" /> Request settlement
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Requires approval by another group member to maintain financial integrity
            </span>
          </div>
          <button
            onClick={closeSettleModal}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

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

        <form onSubmit={handleSubmit}>
          {/* Transfer visual preview */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            marginBottom: '18px'
          }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Who pays</span>
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                {memberNameMap[fromMemberId] || 'Payer'}
              </strong>
            </div>

            <ArrowRight size={20} color="var(--primary)" style={{ margin: '0 8px' }} />

            <div style={{ textAlign: 'center', flex: 1 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Who receives</span>
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                {memberNameMap[toMemberId] || 'Receiver'}
              </strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="from-member-select">Payer (From)</label>
              <select
                id="from-member-select"
                className="form-select"
                value={fromMemberId}
                onChange={(e) => setFromMemberId(e.target.value)}
              >
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="to-member-select">Receiver (To)</label>
              <select
                id="to-member-select"
                className="form-select"
                value={toMemberId}
                onChange={(e) => setToMemberId(e.target.value)}
              >
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="settle-amount-input">
              Amount (₹) <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="settle-amount-input"
              className="form-input"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="settle-note-input">
              Payment reference / Note (optional)
            </label>
            <input
              id="settle-note-input"
              className="form-input"
              type="text"
              placeholder="e.g. Paid via UPI / GPay"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            fontSize: '0.8rem',
            color: 'var(--text-main)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldCheck size={18} color="#6366f1" />
            <span>Another member must approve this request before balances adjust.</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeSettleModal}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-settle-btn"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Request settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
