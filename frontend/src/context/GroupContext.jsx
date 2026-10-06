import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { api } from '../api.js';

const GroupContext = createContext(null);

export function GroupProvider({ children }) {
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroupState] = useState(null);
  const [balances, setBalances] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveNotification, setLiveNotification] = useState(null);

  // Modal controls
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settlePrefill, setSettlePrefill] = useState(null);

  const socketRef = useRef(null);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getGroups();
      setGroups(data);

      const savedId = localStorage.getItem('groupspend_current_group_id');
      const found = data.find((g) => g._id === savedId) || data[0] || null;
      setActiveGroupState(found);
      if (found) {
        localStorage.setItem('groupspend_current_group_id', found._id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const setActiveGroup = (group) => {
    setActiveGroupState(group);
    if (group?._id) {
      localStorage.setItem('groupspend_current_group_id', group._id);
    }
  };

  const refreshActiveGroupData = useCallback(async () => {
    if (!activeGroup?._id) return;
    try {
      const [balData, transData, expData, setlData, grpData] = await Promise.all([
        api.getBalances(activeGroup._id).catch(() => ({ members: [] })),
        api.getTransfers(activeGroup._id).catch(() => []),
        api.getExpenses(activeGroup._id).catch(() => []),
        api.getSettlements(activeGroup._id).catch(() => []),
        api.getGroup(activeGroup._id).catch(() => activeGroup)
      ]);

      setBalances(balData.members || []);
      setTransfers(transData || []);
      setExpenses(expData || []);
      setSettlements(setlData || []);
      if (grpData && grpData._id) {
        setActiveGroupState(grpData);
      }
    } catch (err) {
      console.error('Error refreshing active group data:', err);
    }
  }, [activeGroup?._id]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (activeGroup?._id) {
      refreshActiveGroupData();
    } else {
      setBalances([]);
      setTransfers([]);
      setExpenses([]);
      setSettlements([]);
    }
  }, [activeGroup?._id, refreshActiveGroupData]);

  // Real-time socket setup
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;
    const token = localStorage.getItem('groupspend_token');
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: { token }
    });
    socketRef.current = socket;

    if (activeGroup?._id) {
      socket.emit('join_group', activeGroup._id);
    }

    socket.on('group-notification', (notif) => {
      refreshActiveGroupData();
      if (notif?.message) {
        setLiveNotification(notif.message);
        setTimeout(() => setLiveNotification(null), 5000);
      }
    });

    socket.on('expense:created', (newExp) => {
      refreshActiveGroupData();
      setLiveNotification(`New expense "${newExp.title}" added`);
      setTimeout(() => setLiveNotification(null), 4000);
    });

    socket.on('expense:deleted', () => {
      refreshActiveGroupData();
      setLiveNotification('An expense was deleted');
      setTimeout(() => setLiveNotification(null), 4000);
    });

    socket.on('settlement:created', (newSetl) => {
      refreshActiveGroupData();
      setLiveNotification(`Payment recorded: ${newSetl.fromName || 'Member'} settled up`);
      setTimeout(() => setLiveNotification(null), 4000);
    });

    socket.on('settlement_request:created', () => {
      refreshActiveGroupData();
    });

    socket.on('settlement_request:updated', () => {
      refreshActiveGroupData();
    });

    return () => {
      if (activeGroup?._id) {
        socket.emit('leave_group', activeGroup._id);
      }
      socket.disconnect();
    };
  }, [activeGroup?._id, refreshActiveGroupData]);

  const openSettleModal = (transfer = null) => {
    setSettlePrefill(transfer);
    setSettleModalOpen(true);
  };

  const closeSettleModal = () => {
    setSettleModalOpen(false);
    setSettlePrefill(null);
  };

  return (
    <GroupContext.Provider
      value={{
        groups,
        activeGroup,
        setActiveGroup,
        fetchGroups,
        balances,
        transfers,
        expenses,
        settlements,
        loading,
        error,
        setError,
        liveNotification,
        refreshActiveGroupData,
        createGroupModalOpen,
        setCreateGroupModalOpen,
        addExpenseModalOpen,
        setAddExpenseModalOpen,
        settleModalOpen,
        settlePrefill,
        openSettleModal,
        closeSettleModal,
        socket: socketRef.current
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
}
