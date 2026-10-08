import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useGroup } from '../context/GroupContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { formatRupees, formatDate, getCategoryColor } from '../utils/format.js';
import {
  Receipt,
  Search,
  Filter,
  Trash2,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Users,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  X
} from 'lucide-react';
import SEO from '../components/SEO.jsx';

const CATEGORIES = ['All', 'Food', 'Travel', 'Rent', 'Shopping', 'Bills', 'Other'];

export default function Expenses() {
  const {
    activeGroup,
    expenses,
    refreshActiveGroupData,
    setAddExpenseModalOpen,
    socket
  } = useGroup();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Request deletion modal state
  const [targetExpenseForDeletion, setTargetExpenseForDeletion] = useState(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState(null);

  const fetchDeletionRequests = useCallback(async () => {
    if (!activeGroup?._id) {
      setDeletionRequests([]);
      return;
    }
    try {
      const data = await api.getExpenseDeletionRequests(activeGroup._id);
      setDeletionRequests(Array.isArray(data) ? data : []);
    } catch (_err) {
      // Ignored if user has no permission yet
    }
  }, [activeGroup?._id]);

  useEffect(() => {
    fetchDeletionRequests();
  }, [fetchDeletionRequests]);

  // Real-time socket sync for deletion requests
  useEffect(() => {
    if (!socket) return;
    const handleSync = () => {
      fetchDeletionRequests();
    };
    socket.on('expense_deletion_request:created', handleSync);
    socket.on('expense_deletion_request:updated', handleSync);
    socket.on('expense:deleted', handleSync);

    return () => {
      socket.off('expense_deletion_request:created', handleSync);
      socket.off('expense_deletion_request:updated', handleSync);
      socket.off('expense:deleted', handleSync);
    };
  }, [socket, fetchDeletionRequests]);

  const pendingDeletionRequests = useMemo(() => {
    return deletionRequests.filter((r) => r.status === 'pending');
  }, [deletionRequests]);

  const pendingDeletionMap = useMemo(() => {
    return Object.fromEntries(
      pendingDeletionRequests.map((r) => [String(r.expenseId), r])
    );
  }, [pendingDeletionRequests]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, search, selectedCategory]);

  const handleOpenDeletionModal = (expense) => {
    setTargetExpenseForDeletion(expense);
    setDeletionReason('');
    setRequestError(null);
  };

  const handleCloseDeletionModal = () => {
    setTargetExpenseForDeletion(null);
    setDeletionReason('');
    setRequestError(null);
  };

  const handleSubmitDeletionRequest = async (e) => {
    e.preventDefault();
    if (!targetExpenseForDeletion || !activeGroup?._id) return;
    try {
      setSubmittingRequest(true);
      setRequestError(null);
      await api.requestExpenseDeletion(activeGroup._id, targetExpenseForDeletion._id, {
        reason: deletionReason
      });
      await fetchDeletionRequests();
      await refreshActiveGroupData();
      handleCloseDeletionModal();
    } catch (err) {
      setRequestError(err.message || 'Failed to submit deletion request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleApproveDeletion = async (requestId) => {
    if (!activeGroup?._id) return;
    try {
      setActionLoadingId(requestId);
      await api.approveExpenseDeletion(activeGroup._id, requestId);
      await fetchDeletionRequests();
      await refreshActiveGroupData();
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectDeletion = async (requestId) => {
    if (!activeGroup?._id) return;
    const reason = window.prompt('Optional reason for rejecting deletion:') || '';
    try {
      setActionLoadingId(requestId);
      await api.rejectExpenseDeletion(activeGroup._id, requestId, { reason });
      await fetchDeletionRequests();
      await refreshActiveGroupData();
    } catch (err) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedExpenseId(expandedExpenseId === id ? null : id);
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p>Please log in to view group expenses.</p>
      </div>
    );
  }

  if (!activeGroup) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p>Please select or create a group to view expenses.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SEO title="Expenses" canonicalPath="/expenses" />
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={22} color="var(--primary)" /> Group expenses
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} found
          </span>
        </div>

        <button
          id="expenses-add-btn"
          onClick={() => setAddExpenseModalOpen(true)}
          className="btn btn-primary"
          disabled={(activeGroup.members?.length || 0) < 2}
        >
          <PlusCircle size={18} /> Add expense
        </button>
      </div>

      {/* Pending Deletion Approvals Banner */}
      {pendingDeletionRequests.length > 0 && (
        <div
          className="card"
          style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--warning, #f59e0b)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--warning, #f59e0b)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} /> Pending Expense Deletion Approvals ({pendingDeletionRequests.length})
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Financial Integrity: At least one peer must approve before any entry is deleted
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingDeletionRequests.map((req) => {
              const isRequester = user && (String(req.requesterId) === String(user.id || user._id));
              const isLoading = actionLoadingId === req._id;

              return (
                <div
                  key={req._id}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.96rem', color: 'var(--text-main)' }}>{req.expenseTitle}</strong>
                      <span className="badge" style={{ background: 'var(--danger-light, rgba(239, 68, 68, 0.15))', color: 'var(--danger)' }}>
                        {formatRupees(req.expenseAmount)}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                      Requested by <strong style={{ color: 'var(--text-main)' }}>{req.requesterName}</strong> • {formatDate(req.createdAt)}
                    </span>
                    {req.reason && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px', fontStyle: 'italic' }}>
                        Reason: "{req.reason}"
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isRequester ? (
                      <span className="badge" style={{ background: 'var(--surface-hover)', color: 'var(--warning, #f59e0b)', padding: '6px 12px' }}>
                        <Clock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Your request — Awaiting peer approval
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          style={{ background: 'var(--success, #10b981)', borderColor: 'var(--success, #10b981)' }}
                          disabled={isLoading}
                          onClick={() => handleApproveDeletion(req._id)}
                        >
                          <CheckCircle size={14} /> {isLoading ? 'Approving...' : 'Approve deletion'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          disabled={isLoading}
                          onClick={() => handleRejectDeletion(req._id)}
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            id="search-expenses-input"
            type="text"
            className="form-input"
            placeholder="Search expenses by title or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={15} color="var(--text-dim)" style={{ marginRight: '4px' }} />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory(cat)}
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Receipt size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ fontSize: '1rem', fontWeight: '500' }}>No expenses found</p>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
            {search || selectedCategory !== 'All' ? 'Try adjusting your search filters' : 'Add the first group expense to get started'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredExpenses.map((e) => {
            const isExpanded = expandedExpenseId === e._id;
            const catColor = getCategoryColor(e.category);
            const pendingReq = pendingDeletionMap[String(e._id)];

            // Resolve payers display
            const payerNames = (e.payments && e.payments.length > 0)
              ? e.payments.map((p) => p.name || 'Member').join(', ')
              : 'Unknown';

            return (
              <div
                key={e._id}
                className="card"
                style={{
                  padding: '16px 20px',
                  transition: 'all var(--transition-fast)',
                  border: pendingReq ? '1.5px dashed var(--warning, #f59e0b)' : '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                  {/* Category icon and title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: `${catColor}15`,
                      color: catColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '1rem'
                    }}>
                      {e.category?.[0] || 'O'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>{e.title}</h3>
                        <span className="badge" style={{ background: `${catColor}15`, color: catColor }}>
                          {e.category}
                        </span>
                        {pendingReq && (
                          <span
                            className="badge"
                            style={{
                              background: 'var(--surface-hover)',
                              color: 'var(--warning, #f59e0b)',
                              border: '1px solid var(--warning, #f59e0b)',
                              fontSize: '0.74rem'
                            }}
                          >
                            ⚠️ Deletion requested by {pendingReq.requesterName} (Pending approval)
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                        Paid by <strong style={{ color: 'var(--text-main)' }}>{payerNames}</strong> • {formatDate(e.date)}
                      </span>
                      {e.notes && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px', fontStyle: 'italic' }}>
                          "{e.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: 'auto' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span className="amount-text" style={{ fontSize: '1.2rem', color: 'var(--text-main)', display: 'block' }}>
                        {formatRupees(e.amount)}
                      </span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Split among {e.shares?.length || 0}
                      </span>
                    </div>

                    <button
                      id={`expand-expense-${e._id}`}
                      onClick={() => toggleExpand(e._id)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px', borderRadius: '50%' }}
                      title="Toggle breakdown"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    <button
                      id={`delete-expense-${e._id}`}
                      onClick={() => handleOpenDeletionModal(e)}
                      className="btn btn-danger btn-sm"
                      style={{ padding: '6px', borderRadius: '50%', opacity: pendingReq ? 0.5 : 1 }}
                      disabled={Boolean(pendingReq)}
                      title={pendingReq ? 'Deletion already requested for peer review' : 'Request deletion for peer approval'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Expanded Contribution Breakdown: Paid vs Share */}
                {isExpanded && (
                  <div style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border)',
                    animation: 'fadeIn 0.15s ease'
                  }}>
                    <h4 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                      Contribution Breakdown (Paid vs Share)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                      {(activeGroup.members || []).map((m) => {
                        const mId = String(m._id);
                        const paidLine = (e.payments || []).find((p) => String(p.memberId) === mId);
                        const shareLine = (e.shares || []).find((s) => String(s.memberId) === mId);
                        const paidAmt = paidLine?.amount || 0;
                        const shareAmt = shareLine?.amount || 0;
                        const netContribution = paidAmt - shareAmt;

                        if (paidAmt === 0 && shareAmt === 0) return null;

                        return (
                          <div
                            key={mId}
                            style={{
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '8px 12px',
                              fontSize: '0.84rem'
                            }}
                          >
                            <span style={{ fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                              {m.name}
                            </span>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              <span>Paid: {formatRupees(paidAmt)}</span>
                              <span>Share: {formatRupees(shareAmt)}</span>
                            </div>
                            <div style={{ marginTop: '4px', fontSize: '0.78rem', fontWeight: '600' }}>
                              <span className={netContribution >= 0 ? 'amount-positive' : 'amount-negative'}>
                                {netContribution >= 0 ? `+${formatRupees(netContribution)}` : formatRupees(netContribution)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Request Expense Deletion Modal */}
      {targetExpenseForDeletion && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} color="var(--warning, #f59e0b)" /> Request expense deletion
              </h3>
              <button
                type="button"
                onClick={handleCloseDeletionModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.4' }}>
              To maintain financial integrity, deleting an expense requires approval from at least one group peer before balances are updated.
            </p>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Expense Title</span>
                <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{targetExpenseForDeletion.title}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Amount</span>
                <strong style={{ fontSize: '0.96rem', color: 'var(--danger)' }}>{formatRupees(targetExpenseForDeletion.amount)}</strong>
              </div>
            </div>

            {requestError && (
              <div style={{ background: 'var(--danger-light, rgba(239, 68, 68, 0.1))', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem', marginBottom: '14px' }}>
                {requestError}
              </div>
            )}

            <form onSubmit={handleSubmitDeletionRequest}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                  Reason for deletion (optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Duplicate entry, incorrect receipt, replaced bill"
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  maxLength={250}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseDeletionModal}
                  disabled={submittingRequest}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={submittingRequest}
                >
                  {submittingRequest ? 'Submitting...' : 'Request deletion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
