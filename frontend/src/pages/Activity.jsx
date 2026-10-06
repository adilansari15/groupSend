import React, { useState, useEffect } from 'react';
import { useGroup } from '../context/GroupContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import {
  Activity as ActivityIcon,
  Receipt,
  ArrowRightLeft,
  UserPlus,
  Trash2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function Activity() {
  const { activeGroup, socket } = useGroup();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'payments' | 'settlements' | 'members'

  const fetchActivity = async () => {
    if (!activeGroup?._id) return;
    try {
      setLoading(true);
      const data = await api.getActivity(activeGroup._id);
      setItems(data || []);
    } catch (err) {
      console.error('Failed to load group activity:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [activeGroup?._id]);

  // Live real-time notification listener to update feed instantly
  useEffect(() => {
    if (!socket || !activeGroup?._id) return;

    const handleNotification = (notif) => {
      if (String(notif.groupId) === String(activeGroup._id)) {
        setItems((prev) => [
          {
            id: notif._id || Date.now(),
            type: notif.type,
            actorName: notif.actorName,
            message: notif.message,
            metadata: notif.metadata,
            timestamp: notif.createdAt || new Date(),
            isAudit: false
          },
          ...prev
        ]);
      }
    };

    socket.on('group-notification', handleNotification);

    return () => {
      socket.off('group-notification', handleNotification);
    };
  }, [socket, activeGroup?._id]);

  const { user } = useAuth();

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p>Please log in to view group activity.</p>
      </div>
    );
  }

  if (!activeGroup) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p>Please select or create a group to view activity.</p>
      </div>
    );
  }

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'payments') {
      return item.type.includes('payment') || item.type.includes('expense');
    }
    if (filter === 'settlements') {
      return item.type.includes('settlement');
    }
    if (filter === 'members') {
      return item.type.includes('member');
    }
    return true;
  });

  const getActionIcon = (type) => {
    if (type.includes('expense') || type.includes('payment_created')) {
      return <Receipt size={18} color="var(--primary)" />;
    }
    if (type.includes('deleted')) {
      return <Trash2 size={18} color="var(--danger)" />;
    }
    if (type.includes('settlement_completed') || type.includes('settlement_approved')) {
      return <CheckCircle2 size={18} color="var(--success)" />;
    }
    if (type.includes('settlement')) {
      return <ArrowRightLeft size={18} color="var(--warning)" />;
    }
    if (type.includes('member')) {
      return <UserPlus size={18} color="#6366f1" />;
    }
    return <ActivityIcon size={18} color="var(--primary)" />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ActivityIcon size={22} color="var(--primary)" /> Group activity & audit trail
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Real-time chronological timeline of payments, settlements, and member actions in {activeGroup.name}
          </span>
        </div>

        {/* Filter Pills */}
        <div style={{
          display: 'flex',
          gap: '4px',
          background: 'var(--card-bg)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)'
        }}>
          {['all', 'payments', 'settlements', 'members'].map((cat) => (
            <button
              key={cat}
              className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(cat)}
              style={{ padding: '4px 10px', fontSize: '0.78rem', textTransform: 'capitalize', border: 'none' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading activity history...
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Clock size={32} color="var(--text-dim)" style={{ marginBottom: '8px' }} />
            <p>No activity recorded for this filter yet.</p>
          </div>
        ) : (
          <div>
            {filteredItems.map((item, idx) => {
              const dateObj = new Date(item.timestamp);
              const formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
              const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '16px 20px',
                    borderBottom: idx !== filteredItems.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    {getActionIcon(item.type)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--text-main)' }}>
                        {item.message || (
                          <span>
                            <strong>{item.actorName}</strong> executed {item.type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {formattedDate} at {formattedTime}
                      </span>
                    </div>

                    {item.payload && Object.keys(item.payload).length > 0 && (
                      <div style={{
                        marginTop: '4px',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        background: 'var(--bg)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        display: 'inline-block'
                      }}>
                        {item.payload.title && <span>Title: {item.payload.title} • </span>}
                        {item.payload.amount && <span>Amount: ₹{(item.payload.amount / 100).toFixed(2)} • </span>}
                        {item.payload.approvedBy && <span>Approved by: {item.payload.approvedBy}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
