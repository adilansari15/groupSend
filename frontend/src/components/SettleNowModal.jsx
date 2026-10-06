import React, { useState, useEffect } from 'react';
import { useGroup } from '../context/GroupContext.jsx';
import { api } from '../api.js';
import { formatRupees, rupeesToPaise } from '../utils/format.js';
import { X, ArrowRightLeft, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

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
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
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
      setDate(new Date().toISOString().split('T')[0]);
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
      await api.createSettlement(activeGroup._id, {
        from: fromMemberId,
        to: toMemberId,
        amount: paise,
        date: new Date(date).toISOString()
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.28rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRightLeft size={20} color="var(--primary)" /> Record settlement
          </h2>
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
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Who pays whom summary card */}
          {fromMemberId && toMemberId && fromMemberId !== toMemberId && (
            <div style={{
              background: 'var(--primary-light)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              fontSize: '0.9rem'
            }}>
              <span style={{ fontWeight: '700', color: 'var(--primary-hover)' }}>
                {memberNameMap[fromMemberId]}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary)' }}>
                pays <ArrowRight size={14} />
              </span>
              <span style={{ fontWeight: '700', color: 'var(--primary-hover)' }}>
                {memberNameMap[toMemberId]}
              </span>
            </div>
          )}

          {/* From Member */}
          <div className="form-group">
            <label className="form-label" htmlFor="settle-from-select">
              Who is paying?
            </label>
            <select
              id="settle-from-select"
              className="form-select"
              value={fromMemberId}
              onChange={(e) => setFromMemberId(e.target.value)}
            >
              {members.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* To Member */}
          <div className="form-group">
            <label className="form-label" htmlFor="settle-to-select">
              Who is receiving?
            </label>
            <select
              id="settle-to-select"
              className="form-select"
              value={toMemberId}
              onChange={(e) => setToMemberId(e.target.value)}
            >
              {members.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Amount & Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="settle-amount-input">
                Amount (₹)
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
                style={{ fontWeight: '700' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="settle-date-input">
                Date
              </label>
              <input
                id="settle-date-input"
                className="form-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
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
              id="confirm-settle-btn"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Recording...' : 'Settle now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
