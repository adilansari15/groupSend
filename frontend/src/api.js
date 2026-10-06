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
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.error || `HTTP ${res.status}: Failed request`);
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

  // Groups
  getGroups: () => request('/groups'),
  createGroup: (data) => request('/groups', { method: 'POST', body: JSON.stringify(data) }),
  getGroup: (id) => request(`/groups/${id}`),
  deleteGroup: (id) => request(`/groups/${id}`, { method: 'DELETE' }),
  addMember: (groupId, data) => request(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  joinGroup: (groupId, data) => request(`/groups/${groupId}/join`, { method: 'POST', body: JSON.stringify(data) }),

  // Balances & Transfers
  getBalances: (groupId) => request(`/groups/${groupId}/balances`),
  getTransfers: (groupId) => request(`/groups/${groupId}/transfers`),

  // Expenses
  getExpenses: (groupId) => request(`/groups/${groupId}/expenses`),
  createExpense: (groupId, data) => request(`/groups/${groupId}/expenses`, { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  // Settlements
  getSettlements: (groupId) => request(`/groups/${groupId}/settlements`),
  createSettlement: (groupId, data) => request(`/groups/${groupId}/settlements`, { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getReports: (groupId, period = 'monthly') => request(`/groups/${groupId}/reports?period=${period}`),
};
