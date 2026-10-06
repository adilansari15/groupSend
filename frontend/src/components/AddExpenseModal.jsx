import React, { useState, useEffect, useMemo } from 'react';
import { useGroup } from '../context/GroupContext.jsx';
import { api } from '../api.js';
import { formatRupees, rupeesToPaise } from '../utils/format.js';
import { splitEqual, balances, transfers } from '../utils/settlement.js';
import { X, Receipt, ArrowRight, CheckCircle2, AlertCircle, Users } from 'lucide-react';

const CATEGORIES = ['Food', 'Travel', 'Rent', 'Shopping', 'Bills', 'Other'];

export default function AddExpenseModal() {
  const {
    activeGroup,
    addExpenseModalOpen,
    setAddExpenseModalOpen,
    refreshActiveGroupData
  } = useGroup();

  const members = activeGroup?.members || [];

  const [title, setTitle] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Payer Mode: 'single' | 'multiple'
  const [payerMode, setPayerMode] = useState('single');
  const [payerId, setPayerId] = useState('');
  const [multiplePayments, setMultiplePayments] = useState({});

  // Split mode: 'equal' | 'custom'
  const [splitMode, setSplitMode] = useState('equal');
  // For equal split: Set of memberIds who participate
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
  // For custom split: Map of memberId -> amount in rupees string
  const [customShares, setCustomShares] = useState({});

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recordedResult, setRecordedResult] = useState(null);

  // Initialize defaults when modal opens
  useEffect(() => {
    if (addExpenseModalOpen && members.length > 0) {
      setPayerMode('single');
      setPayerId(String(members[0]._id));

      const initPayments = {};
      members.forEach((m) => { initPayments[String(m._id)] = ''; });
      setMultiplePayments(initPayments);

      setSelectedMemberIds(new Set(members.map((m) => String(m._id))));
      const initShares = {};
      members.forEach((m) => { initShares[String(m._id)] = ''; });
      setCustomShares(initShares);

      setTitle('');
      setAmountRupees('');
      setError('');
      setRecordedResult(null);
    }
  }, [addExpenseModalOpen, members]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && addExpenseModalOpen) {
        setAddExpenseModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addExpenseModalOpen, setAddExpenseModalOpen]);

  // Compute total paise
  const totalPaise = rupeesToPaise(amountRupees);

  // Compute payments array
  const calculatedPayments = useMemo(() => {
    if (!totalPaise) return [];
    if (payerMode === 'single') {
      return payerId ? [{ memberId: payerId, amount: totalPaise }] : [];
    } else {
      return Object.entries(multiplePayments)
        .map(([mId, val]) => ({
          memberId: mId,
          amount: rupeesToPaise(val)
        }))
        .filter((p) => p.amount > 0);
    }
  }, [totalPaise, payerMode, payerId, multiplePayments]);

  const multiplePaymentsTotalPaise = useMemo(() => {
    return Object.values(multiplePayments).reduce((acc, v) => acc + rupeesToPaise(v), 0);
  }, [multiplePayments]);

  // Compute shares array
  const calculatedShares = useMemo(() => {
    if (!totalPaise) return [];
    if (splitMode === 'equal') {
      const activeIds = Array.from(selectedMemberIds);
      return splitEqual(totalPaise, activeIds);
    } else {
      return Object.entries(customShares)
        .map(([mId, val]) => ({
          memberId: mId,
          amount: rupeesToPaise(val)
        }))
        .filter((s) => s.amount > 0);
    }
  }, [totalPaise, splitMode, selectedMemberIds, customShares]);

  const customSharesTotalPaise = useMemo(() => {
    return Object.values(customShares).reduce((acc, v) => acc + rupeesToPaise(v), 0);
  }, [customShares]);

  // Live "Who will pay to whom" preview
  const liveTransfers = useMemo(() => {
    if (!totalPaise || calculatedPayments.length === 0 || calculatedShares.length === 0) return [];
    const allIds = members.map((m) => String(m._id));
    const expenseObject = {
      payments: calculatedPayments,
      shares: calculatedShares
    };
    const b = balances(allIds, [expenseObject]);
    return transfers(b);
  }, [totalPaise, calculatedPayments, calculatedShares, members]);

  const memberNameMap = useMemo(() => {
    return Object.fromEntries(members.map((m) => [String(m._id), m.name]));
  }, [members]);

  if (!addExpenseModalOpen) return null;

  const toggleMemberSelection = (id) => {
    const next = new Set(selectedMemberIds);
    if (next.has(id)) {
      if (next.size <= 1) {
        setError('At least one member must share the expense');
        return;
      }
      next.delete(id);
    } else {
      next.add(id);
    }
    setError('');
    setSelectedMemberIds(next);
  };

  const handleCustomShareChange = (id, val) => {
    setCustomShares({ ...customShares, [id]: val });
    setError('');
  };

  const handleMultiplePaymentChange = (id, val) => {
    setMultiplePayments({ ...multiplePayments, [id]: val });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Expense title is required');
      return;
    }
    if (!totalPaise || totalPaise <= 0) {
      setError('Please enter a valid expense amount');
      return;
    }

    if (payerMode === 'single' && !payerId) {
      setError('Please select who paid for this expense');
      return;
    }

    if (payerMode === 'multiple') {
      if (multiplePaymentsTotalPaise !== totalPaise) {
        const diff = (totalPaise - multiplePaymentsTotalPaise) / 100;
        setError(
          `Payments sum (${formatRupees(multiplePaymentsTotalPaise)}) must equal total amount (${formatRupees(totalPaise)}). Difference: ₹${diff.toFixed(2)}`
        );
        return;
      }
    }

    if (splitMode === 'equal' && selectedMemberIds.size < 1) {
      setError('Select at least one member to share the expense');
      return;
    }

    if (splitMode === 'custom') {
      if (customSharesTotalPaise !== totalPaise) {
        const diff = (totalPaise - customSharesTotalPaise) / 100;
        setError(
          `Custom split total (${formatRupees(customSharesTotalPaise)}) must match expense amount (${formatRupees(totalPaise)}). Difference: ₹${diff.toFixed(2)}`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      setError('');

      const savedExpense = await api.createExpense(activeGroup._id, {
        title: title.trim(),
        amount: totalPaise,
        category,
        date: new Date(date).toISOString(),
        notes: notes.trim(),
        payments: calculatedPayments,
        shares: calculatedShares
      });

      await refreshActiveGroupData();
      setRecordedResult({
        expense: savedExpense,
        transfers: liveTransfers,
        shares: calculatedShares
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // If successfully recorded, show confirmation breakdown
  if (recordedResult) {
    return (
      <div className="modal-overlay" onClick={() => setAddExpenseModalOpen(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--success-light)',
              color: 'var(--success)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}>
              <CheckCircle2 size={28} />
            </div>
            <h2 style={{ fontSize: '1.3rem', color: 'var(--text-main)' }}>Expense recorded!</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              {recordedResult.expense.title} • {formatRupees(recordedResult.expense.amount)}
            </p>
          </div>

          {/* Settlement breakdown preview */}
          <div className="split-preview-card" style={{ marginBottom: '18px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-purple)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Settlement breakdown
            </h4>
            {recordedResult.transfers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recordedResult.transfers.map((t, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.88rem',
                    padding: '6px 10px',
                    background: 'var(--card-bg)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)'
                  }}>
                    <span style={{ fontWeight: '600' }}>{memberNameMap[t.from]}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                      pays <ArrowRight size={14} />
                    </span>
                    <span style={{ fontWeight: '600' }}>{memberNameMap[t.to]}</span>
                    <span className="amount-text" style={{ color: 'var(--accent-purple)', fontWeight: '700' }}>
                      {formatRupees(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No settlement transfers required.</p>
            )}
          </div>

          <button
            id="close-breakdown-btn"
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => {
              setRecordedResult(null);
              setAddExpenseModalOpen(false);
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={() => setAddExpenseModalOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.28rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={20} color="var(--primary)" /> Add new expense
          </h2>
          <button
            onClick={() => setAddExpenseModalOpen(false)}
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
          {/* Title & Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="expense-title-input">
                Title <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="expense-title-input"
                className="form-input"
                type="text"
                placeholder="e.g. Dinner, Fuel, Grocery"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="expense-amount-input">
                Amount (₹) <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="expense-amount-input"
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
          </div>

          {/* Category & Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="expense-category-select">Category</label>
              <select
                id="expense-category-select"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="expense-date-input">Date</label>
              <input
                id="expense-date-input"
                className="form-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Paid by: Single vs Multiple Payers Toggle */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Paid by <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${payerMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPayerMode('single')}
                  style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                >
                  Single payer
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${payerMode === 'multiple' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPayerMode('multiple')}
                  style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                >
                  Multiple payers
                </button>
              </div>
            </div>

            {payerMode === 'single' ? (
              <select
                id="expense-payer-select"
                className="form-select"
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
              >
                {members.map((m) => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            ) : (
              <div style={{
                background: 'var(--bg)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Enter amount each member paid (₹)</span>
                  <span style={{ fontWeight: '600', color: multiplePaymentsTotalPaise === totalPaise ? 'var(--success)' : 'var(--danger)' }}>
                    Total paid: {formatRupees(multiplePaymentsTotalPaise)} / {formatRupees(totalPaise)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {members.map((m) => (
                    <div key={m._id} style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{m.name}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        placeholder="0.00"
                        value={multiplePayments[String(m._id)] || ''}
                        onChange={(e) => handleMultiplePaymentChange(String(m._id), e.target.value)}
                        style={{ padding: '6px 10px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Split Mode Selector */}
          <div style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Split method</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                id="split-mode-equal"
                className={`btn btn-sm ${splitMode === 'equal' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSplitMode('equal')}
              >
                Equal split
              </button>
              <button
                type="button"
                id="split-mode-custom"
                className={`btn btn-sm ${splitMode === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSplitMode('custom')}
              >
                Custom split
              </button>
            </div>
          </div>

          {/* Split details */}
          {splitMode === 'equal' ? (
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                Select members to split among ({selectedMemberIds.size} selected)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                {members.map((m) => {
                  const isChecked = selectedMemberIds.has(String(m._id));
                  return (
                    <label
                      key={m._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        background: isChecked ? 'var(--primary-light)' : 'var(--bg)',
                        border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: isChecked ? '600' : '400',
                        color: isChecked ? 'var(--primary)' : 'var(--text-main)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleMemberSelection(String(m._id))}
                      />
                      <span>{m.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Enter each member's share (₹)</span>
                <span style={{ fontWeight: '600', color: customSharesTotalPaise === totalPaise ? 'var(--success)' : 'var(--danger)' }}>
                  Total shares: {formatRupees(customSharesTotalPaise)} / {formatRupees(totalPaise)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.map((m) => (
                  <div key={m._id} style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{m.name}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      placeholder="0.00"
                      value={customShares[String(m._id)] || ''}
                      onChange={(e) => handleCustomShareChange(String(m._id), e.target.value)}
                      style={{ padding: '6px 10px' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live "Who will pay to whom" preview */}
          {liveTransfers.length > 0 && (
            <div className="split-preview-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent-purple)' }}>
                  Live preview: Who will pay whom
                </span>
                <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
                  {liveTransfers.length} transfer{liveTransfers.length > 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {liveTransfers.map((t, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.84rem',
                    background: 'var(--card-bg)',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)'
                  }}>
                    <span style={{ fontWeight: '600' }}>{memberNameMap[t.from]}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                      owes <ArrowRight size={12} />
                    </span>
                    <span style={{ fontWeight: '600' }}>{memberNameMap[t.to]}</span>
                    <span className="amount-text" style={{ color: 'var(--accent-purple)' }}>
                      {formatRupees(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label" htmlFor="expense-notes-input">Notes (optional)</label>
            <input
              id="expense-notes-input"
              className="form-input"
              type="text"
              placeholder="e.g. Split equally excluding drinks"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setAddExpenseModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-expense-btn"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
