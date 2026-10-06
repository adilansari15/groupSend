import { Router } from 'express';
import {
  listGroups,
  createGroup,
  getGroup,
  getGroupInvitePreview,
  deleteGroup,
  addMember,
  joinGroup,
  getBalances,
  getTransfers
} from '../controllers/groups.js';
import { listExpenses, createExpense, deleteExpense } from '../controllers/expenses.js';
import { listSettlements, createSettlement } from '../controllers/settlements.js';
import { getReports } from '../controllers/reports.js';
import { listChatMessages, sendChatMessage } from '../controllers/chat.js';
import { listNotifications, listActivity } from '../controllers/activity.js';
import {
  listSettlementRequests,
  createSettlementRequest,
  approveSettlementRequest,
  rejectSettlementRequest
} from '../controllers/settlementRequests.js';
import {
  listExpenseDeletionRequests,
  createExpenseDeletionRequest,
  approveExpenseDeletionRequest,
  rejectExpenseDeletionRequest
} from '../controllers/expenseDeletionRequests.js';
import { requireAuth, optionalAuth, requireGroupMember } from '../middleware/auth.js';

const r = Router();

// Groups & Members
r.get('/', optionalAuth, listGroups);
r.post('/', requireAuth, createGroup);
r.get('/:id/invite', getGroupInvitePreview);
r.get('/:id', requireGroupMember, getGroup);
r.delete('/:id', requireAuth, deleteGroup);
r.post('/:id/members', requireAuth, addMember);
r.post('/:id/join', requireAuth, joinGroup);

// Balances & Minimal Transfers (Members Only)
r.get('/:id/balances', requireGroupMember, getBalances);
r.get('/:id/transfers', requireGroupMember, getTransfers);

// Group Expenses (Members Only)
r.get('/:id/expenses', requireGroupMember, listExpenses);
r.post('/:id/expenses', requireGroupMember, createExpense);

// Expense Deletion Requests & Peer Approval Workflow (Members Only)
r.get('/:id/expense-deletion-requests', requireGroupMember, listExpenseDeletionRequests);
r.post('/:id/expenses/:expenseId/request-deletion', requireGroupMember, createExpenseDeletionRequest);
r.post('/:id/expense-deletion-requests/:requestId/approve', requireGroupMember, approveExpenseDeletionRequest);
r.post('/:id/expense-deletion-requests/:requestId/reject', requireGroupMember, rejectExpenseDeletionRequest);

// Group Settlements (Members Only)
r.get('/:id/settlements', requireGroupMember, listSettlements);
r.post('/:id/settlements', requireGroupMember, createSettlement);

// Settlement Requests & Peer Approval Workflow (Members Only)
r.get('/:id/settlement-requests', requireGroupMember, listSettlementRequests);
r.post('/:id/settlement-requests', requireGroupMember, createSettlementRequest);
r.post('/:id/settlement-requests/:requestId/approve', requireGroupMember, approveSettlementRequest);
r.post('/:id/settlement-requests/:requestId/reject', requireGroupMember, rejectSettlementRequest);

// Real-Time Group Chat (Members Only)
r.get('/:id/chat', requireGroupMember, listChatMessages);
r.post('/:id/chat', requireGroupMember, sendChatMessage);

// Notifications & Activity Feed (Members Only)
r.get('/:id/notifications', requireGroupMember, listNotifications);
r.get('/:id/activity', requireGroupMember, listActivity);

// Group Reports (Members Only)
r.get('/:id/reports', requireGroupMember, getReports);

export default r;
