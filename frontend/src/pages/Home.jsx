import React from 'react';
import { useGroup } from '../context/GroupContext.jsx';
import { formatRupees, formatDate, getCategoryColor } from '../utils/format.js';
import {
  Wallet,
  ArrowRightLeft,
  Calendar,
  Receipt,
  ArrowRight,
  PlusCircle,
  TrendingUp,
  Clock
} from 'lucide-react';

export default function Home() {
  const {
    activeGroup,
    balances,
    transfers,
    expenses,
    openSettleModal,
    setAddExpenseModalOpen,
    setCreateGroupModalOpen
  } = useGroup();

  if (!activeGroup) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Welcome to GroupSpend</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Create a group to start tracking shared expenses with friends and roommates.
        </p>
        <button
          onClick={() => setCreateGroupModalOpen(true)}
          className="btn btn-primary"
        >
          <PlusCircle size={18} /> Create group
        </button>
      </div>
    );
  }

  // Calculate stats
  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = startOfToday - 29 * 24 * 60 * 60 * 1000;

  const todaySpend = expenses.reduce((sum, e) => {
    return new Date(e.date).getTime() >= startOfToday ? sum + e.amount : sum;
  }, 0);

  const weekSpend = expenses.reduce((sum, e) => {
    return new Date(e.date).getTime() >= sevenDaysAgo ? sum + e.amount : sum;
  }, 0);

  const monthSpend = expenses.reduce((sum, e) => {
    return new Date(e.date).getTime() >= thirtyDaysAgo ? sum + e.amount : sum;
  }, 0);

  const recentExpenses = expenses.slice(0, 5);

  const memberNameMap = Object.fromEntries(
    (activeGroup.members || []).map((m) => [String(m._id), m.name])
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner: Group Balance Status */}
      <div style={{
        background: 'linear-gradient(135deg, #1f8a7a 0%, #157365 100%)',
        color: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        padding: '28px',
        boxShadow: '0 8px 24px var(--primary-glow)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        <div>
          <span style={{ fontSize: '0.85rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
            Group Balance Status
          </span>
          <h2 style={{ fontSize: '2.4rem', fontWeight: '800', marginTop: '6px', fontFamily: 'Outfit, sans-serif' }}>
            {formatRupees(totalSpend)}
          </h2>
          <p style={{ opacity: 0.85, fontSize: '0.9rem', marginTop: '4px' }}>
            Total spent across {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.75rem', opacity: 0.85, display: 'block' }}>Pending settlements</span>
            <span style={{ fontSize: '1.4rem', fontWeight: '700', fontFamily: 'Outfit' }}>
              {transfers.length}
            </span>
          </div>

          <button
            id="home-add-expense-btn"
            onClick={() => setAddExpenseModalOpen(true)}
            className="btn"
            style={{
              background: '#ffffff',
              color: 'var(--primary)',
              padding: '12px 20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
            disabled={(activeGroup.members?.length || 0) < 2}
          >
            <PlusCircle size={18} /> Add expense
          </button>
        </div>
      </div>

      {/* Period totals (today / week / month) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Today</span>
            <h3 className="amount-text" style={{ fontSize: '1.25rem', marginTop: '2px' }}>
              {formatRupees(todaySpend)}
            </h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-purple-light)',
            color: 'var(--accent-purple)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>This week</span>
            <h3 className="amount-text" style={{ fontSize: '1.25rem', marginTop: '2px' }}>
              {formatRupees(weekSpend)}
            </h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.1)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Calendar size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>This month</span>
            <h3 className="amount-text" style={{ fontSize: '1.25rem', marginTop: '2px' }}>
              {formatRupees(monthSpend)}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Grid: Who pays whom & Recent expenses */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Who Pays Whom Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowRightLeft size={18} color="var(--primary)" /> Who pays whom
            </h3>
            <span className="badge badge-teal">
              {transfers.length === 0 ? 'All settled' : `${transfers.length} pending`}
            </span>
          </div>

          {transfers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.92rem', fontWeight: '500' }}>Everyone is all squared up! 🎉</p>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                No pending payments between group members.
              </span>
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
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.92rem' }}>
                      {t.fromName || memberNameMap[t.from] || 'Unknown'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                      owes <ArrowRight size={12} />
                    </span>
                    <span style={{ fontWeight: '600', fontSize: '0.92rem' }}>
                      {t.toName || memberNameMap[t.to] || 'Unknown'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="amount-text" style={{ fontSize: '1rem', color: 'var(--primary)' }}>
                      {formatRupees(t.amount)}
                    </span>
                    <button
                      id={`settle-transfer-btn-${idx}`}
                      onClick={() => openSettleModal(t)}
                      className="btn btn-sm btn-primary"
                    >
                      Settle now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Expenses Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={18} color="var(--primary)" /> Recent expenses
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {expenses.length} total
            </span>
          </div>

          {recentExpenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.92rem' }}>No expenses recorded yet</p>
              <button
                onClick={() => setAddExpenseModalOpen(true)}
                className="btn btn-sm btn-outline"
                style={{ marginTop: '12px' }}
                disabled={(activeGroup.members?.length || 0) < 2}
              >
                Add first expense
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentExpenses.map((e) => {
                const catColor = getCategoryColor(e.category);
                const payerName = e.payments?.length
                  ? memberNameMap[e.payments[0].memberId] || 'Member'
                  : 'Member';
                const extraPayers = (e.payments?.length || 0) - 1;

                return (
                  <div
                    key={e._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{e.title}</span>
                        <span
                          className="badge"
                          style={{
                            background: `${catColor}15`,
                            color: catColor,
                            fontSize: '0.72rem'
                          }}
                        >
                          {e.category}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                        Paid by {payerName}{extraPayers > 0 ? ` +${extraPayers} others` : ''} • {formatDate(e.date)}
                      </span>
                    </div>

                    <span className="amount-text" style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                      {formatRupees(e.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
