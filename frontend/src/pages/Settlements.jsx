import React from 'react';
import { useGroup } from '../context/GroupContext.jsx';
import { formatRupees, formatDate } from '../utils/format.js';
import {
  ArrowRightLeft,
  ArrowRight,
  CheckCircle,
  History,
  PlusCircle
} from 'lucide-react';

export default function Settlements() {
  const {
    activeGroup,
    transfers,
    settlements,
    openSettleModal
  } = useGroup();

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRightLeft size={22} color="var(--primary)" /> Settlements
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Minimal payment transfers and historical settlement records
          </span>
        </div>

        <button
          id="custom-settle-btn"
          onClick={() => openSettleModal(null)}
          className="btn btn-secondary"
          disabled={(activeGroup.members?.length || 0) < 2}
        >
          <PlusCircle size={16} /> Record settlement
        </button>
      </div>

      {/* Pending Transfers (Minimal Transfers Algorithm Output) */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Pending settlements ({transfers.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Calculated with minimal transfer matching
          </span>
        </div>

        {transfers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
            <CheckCircle size={36} color="var(--success)" style={{ marginBottom: '10px' }} />
            <h4 style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>All settled up!</h4>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              There are no pending debts among members in this group.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {transfers.map((t, idx) => {
              const fromName = t.fromName || memberNameMap[t.from] || 'Member';
              const toName = t.toName || memberNameMap[t.to] || 'Member';

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'var(--danger-light)',
                      color: 'var(--danger)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700'
                    }}>
                      {fromName[0]}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.94rem' }}>
                        <span style={{ fontWeight: '700' }}>{fromName}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                          owes <ArrowRight size={14} />
                        </span>
                        <span style={{ fontWeight: '700' }}>{toName}</span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Pending settlement payment
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: 'auto' }}>
                    <span className="amount-text" style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
                      {formatRupees(t.amount)}
                    </span>
                    <button
                      id={`settle-transfer-page-btn-${idx}`}
                      onClick={() => openSettleModal(t)}
                      className="btn btn-primary btn-sm"
                    >
                      Settle now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settlement History Log */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="var(--primary)" /> Settlement history ({settlements.length})
        </h3>

        {settlements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-muted)' }}>
            No settlements recorded yet in this group.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {settlements.map((s) => {
              const fromName = s.fromName || memberNameMap[String(s.from)] || 'Member';
              const toName = s.toName || memberNameMap[String(s.to)] || 'Member';

              return (
                <div
                  key={s._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: '600' }}>{fromName}</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>paid</span>
                      <span style={{ fontWeight: '600' }}>{toName}</span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                      Settled on {formatDate(s.date)}
                    </span>
                  </div>

                  <span className="amount-text amount-positive" style={{ fontSize: '1.05rem' }}>
                    {formatRupees(s.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
