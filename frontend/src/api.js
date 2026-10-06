const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const token = localStorage.getItem('groupspend_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  const res = await fetch(url, config);
  let data = {};
  try {
    data = await res.json();
  } catch (_e) {
    // Non-JSON response (e.g. Vite dev proxy 500/502 when backend is down)
  }

  if (!res.ok) {
    const defaultMsg = res.status >= 500
      ? 'Backend server is unreachable. Please verify that the backend server is running on port 5000.'
      : `Request failed (HTTP ${res.status})`;
    const error = new Error(data.error || defaultMsg);
    error.status = res.status;
    error.requiresVerification = Boolean(data.requiresVerification);
    error.email = data.email;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  verifyEmail: (data) => request('/auth/verify-email', { method: 'POST', body: JSON.stringify(data) }),
  resendVerification: (data) => request('/auth/resend-verification', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  // Users Search
  searchUsers: (query) => request(`/users/search?q=${encodeURIComponent(query)}`),

  // Groups
  getGroups: () => request('/groups'),
  createGroup: (data) => request('/groups', { method: 'POST', body: JSON.stringify(data) }),
  getGroup: (id) => request(`/groups/${id}`),
  getGroupInvitePreview: (id) => request(`/groups/${id}/invite`),
  deleteGroup: (id) => request(`/groups/${id}`, { method: 'DELETE' }),
  addMember: (groupId, data) => request(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  joinGroup: (groupId, data) => request(`/groups/${groupId}/join`, { method: 'POST', body: JSON.stringify(data) }),

  // Balances & Transfers
  getBalances: (groupId) => request(`/groups/${groupId}/balances`),
  getTransfers: (groupId) => request(`/groups/${groupId}/transfers`),

  // Expenses & Peer-Approved Deletion
  getExpenses: (groupId) => request(`/groups/${groupId}/expenses`),
  createExpense: (groupId, data) => request(`/groups/${groupId}/expenses`, { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  getExpenseDeletionRequests: (groupId) => request(`/groups/${groupId}/expense-deletion-requests`),
  requestExpenseDeletion: (groupId, expenseId, data = {}) => request(`/groups/${groupId}/expenses/${expenseId}/request-deletion`, { method: 'POST', body: JSON.stringify(data) }),
  approveExpenseDeletion: (groupId, requestId) => request(`/groups/${groupId}/expense-deletion-requests/${requestId}/approve`, { method: 'POST' }),
  rejectExpenseDeletion: (groupId, requestId, data = {}) => request(`/groups/${groupId}/expense-deletion-requests/${requestId}/reject`, { method: 'POST', body: JSON.stringify(data) }),

  // Settlements & Settlement Requests
  getSettlements: (groupId) => request(`/groups/${groupId}/settlements`),
  createSettlement: (groupId, data) => request(`/groups/${groupId}/settlements`, { method: 'POST', body: JSON.stringify(data) }),
  getSettlementRequests: (groupId) => request(`/groups/${groupId}/settlement-requests`),
  createSettlementRequest: (groupId, data) => request(`/groups/${groupId}/settlement-requests`, { method: 'POST', body: JSON.stringify(data) }),
  approveSettlementRequest: (groupId, requestId) => request(`/groups/${groupId}/settlement-requests/${requestId}/approve`, { method: 'POST' }),
  rejectSettlementRequest: (groupId, requestId) => request(`/groups/${groupId}/settlement-requests/${requestId}/reject`, { method: 'POST' }),

  // Real-Time Group Chat
  getChat: (groupId) => request(`/groups/${groupId}/chat`),
  sendChatMessage: (groupId, message) => request(`/groups/${groupId}/chat`, { method: 'POST', body: JSON.stringify({ message }) }),

  // Notifications & Activity
  getNotifications: (groupId) => request(`/groups/${groupId}/notifications`),
  getActivity: (groupId) => request(`/groups/${groupId}/activity`),

  // Reports
  getReports: (groupId, period = 'monthly') => request(`/groups/${groupId}/reports?period=${period}`),
};
