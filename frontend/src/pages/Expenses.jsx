import React, { useState, useMemo } from 'react';
import { useGroup } from '../context/GroupContext.jsx';
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
  Users
} from 'lucide-react';

const CATEGORIES = ['All', 'Food', 'Travel', 'Rent', 'Shopping', 'Bills', 'Other'];

export default function Expenses() {
  const {
    activeGroup,
    expenses,
    refreshActiveGroupData,
    setAddExpenseModalOpen
  } = useGroup();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const memberNameMap = useMemo(() => {
    return Object.fromEntries(
      (activeGroup?.members || []).map((m) => [String(m._id), m.name])
    );
  }, [activeGroup?.members]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, search, selectedCategory]);

  const handleDeleteExpense = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }
    try {
      setDeletingId(id);
      await api.deleteExpense(id);
      await refreshActiveGroupData();
    } catch (err) {
      alert(`Failed to delete expense: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedExpenseId(expandedExpenseId === id ? null : id);
  };

  if (!activeGroup) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p>Please select or create a group to view expenses.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1rem', fontWeight: '500' }}>No matching expenses</p>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
            Try adjusting your search filter or add a new expense.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredExpenses.map((e) => {
            const catColor = getCategoryColor(e.category);
            const isExpanded = expandedExpenseId === e._id;
            const payerNames = (e.payments || []).map((p) => memberNameMap[p.memberId] || 'Member').join(', ');

            return (
              <div key={e._id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-md)',
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>{e.title}</h3>
                        <span className="badge" style={{ background: `${catColor}15`, color: catColor }}>
                          {e.category}
                        </span>
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
                      onClick={() => handleDeleteExpense(e._id, e.title)}
                      className="btn btn-danger btn-sm"
                      style={{ padding: '6px', borderRadius: '50%' }}
                      disabled={deletingId === e._id}
                      title="Delete expense"
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
    </div>
  );
}
