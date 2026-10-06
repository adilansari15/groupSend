import React, { useState, useEffect } from 'react';
import { useGroup } from '../context/GroupContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { formatRupees, formatDate } from '../utils/format.js';
import {
  ArrowRightLeft,
  ArrowRight,
  CheckCircle,
  History,
  PlusCircle,
  ShieldCheck,
  Clock,
  Check,
  X,
  AlertCircle
} from 'lucide-react';

export default function Settlements() {
  const {
    activeGroup,
    transfers,
    settlements,
    openSettleModal,
    refreshActiveGroupData
  } = useGroup();

  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actionError, setActionError] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const fetchRequests = async () => {
    if (!activeGroup?._id) return;
    try {
      setLoadingRequests(true);
      const data = await api.getSettlementRequests(activeGroup._id);
      setRequests(data || []);
    } catch (err) {
      console.error('Failed to load settlement requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeGroup?._id]);

  const handleApprove = async (requestId) => {
    try {
      setProcessingId(requestId);
      setActionError('');
      await api.approveSettlementRequest(activeGroup._id, requestId);
      await fetchRequests();
      await refreshActiveGroupData();
    } catch (err) {
      setActionError(err.message || 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    try {
      setProcessingId(requestId);
      setActionError('');
      await api.rejectSettlementRequest(activeGroup._id, requestId);
      await fetchRequests();
      await refreshActiveGroupData();
    } catch (err) {
      setActionError(err.message || 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  if (!activeGroup) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p>Please select or create a group to view settlements.</p>
      </div>
    );
  }

  const memberNameMap = Object.fromEntries(
    (activeGroup.members || []).map((m) => [String(m._id), m.name])
  );

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRightLeft size={22} color="var(--primary)" /> Settlements & requests
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Peer-approved settlement workflow and minimal payment transfers
          </span>
        </div>

        <button
          id="custom-settle-btn"
          onClick={() => openSettleModal(null)}
          className="btn btn-primary"
          disabled={(activeGroup.members?.length || 0) < 2}
        >
          <PlusCircle size={16} /> Request settlement
        </button>
      </div>

      {actionError && (
        <div style={{
          background: 'var(--danger-light)',
          color: 'var(--danger)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Pending Settlement Requests Requiring Approval */}
      {pendingRequests.length > 0 && (
        <div className="card" style={{ border: '1px solid var(--primary)', background: 'rgba(31, 138, 122, 0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Clock size={18} color="var(--primary)" /> Pending settlement approvals ({pendingRequests.length})
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Requires at least 1 peer approval to settle
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingRequests.map((req) => {
              const isRequester = user && String(req.requesterId) === String(user.id || user._id);

              return (
                <div
                  key={req._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '14px 16px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.96rem', color: 'var(--text-main)' }}>
                        {req.fromName} → {req.toName}
                      </strong>
                      <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                        Requested by {req.requesterName}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Amount: <strong className="amount-text">{formatRupees(req.amount)}</strong>
                      {req.note && <span> • "{req.note}"</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isRequester ? (
                      <span className="badge badge-teal" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
                        Awaiting peer approval
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(req._id)}
                          className="btn btn-primary btn-sm"
                          disabled={processingId === req._id}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(req._id)}
                          className="btn btn-secondary btn-sm"
                          disabled={processingId === req._id}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <X size={14} /> Reject
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

      {/* Suggested Minimal Transfers */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Suggested transfers ({transfers.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Calculated via minimal settlement algorithm
          </span>
        </div>

        {transfers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
            <CheckCircle size={36} color="var(--success)" style={{ marginBottom: '8px' }} />
            <p style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '1rem' }}>All settled up!</p>
            <span style={{ fontSize: '0.84rem' }}>No pending transfers needed across members.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {transfers.map((t, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'var(--bg)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--surface-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)'
                  }}>
                    <ArrowRightLeft size={16} />
                  </div>

                  <div>
                    <span style={{ fontSize: '0.94rem', color: 'var(--text-main)', fontWeight: '600' }}>
                      {t.fromName}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 8px' }}>owes</span>
                    <span style={{ fontSize: '0.94rem', color: 'var(--text-main)', fontWeight: '600' }}>
                      {t.toName}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <strong className="amount-text" style={{ fontSize: '1.15rem' }}>
                    {formatRupees(t.amount)}
                  </strong>
                  <button
                    onClick={() => openSettleModal(t)}
                    className="btn btn-secondary btn-sm"
                  >
                    Request settlement
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Settlement Records */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="var(--primary)" /> Settlement history ({settlements.length})
        </h3>

        {settlements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
            <p>No settlements recorded in this group yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {settlements.map((s) => (
              <div
                key={s._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} color="var(--success)" />
                    <span style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                      <strong>{s.fromName || memberNameMap[s.from] || 'Member'}</strong> paid{' '}
                      <strong>{s.toName || memberNameMap[s.to] || 'Member'}</strong>
                    </span>
                  </div>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginLeft: '22px' }}>
                    {formatDate(s.date || s.createdAt)}
                  </span>
                </div>

                <strong className="amount-text amount-positive" style={{ fontSize: '1.05rem' }}>
                  {formatRupees(s.amount)}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
