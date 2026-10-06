import { Router } from 'express';
import {
  listGroups,
  createGroup,
  getGroup,
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
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const r = Router();

// Groups & Members
r.get('/', optionalAuth, listGroups);
r.post('/', requireAuth, createGroup);
r.get('/:id', getGroup);
r.delete('/:id', requireAuth, deleteGroup);
r.post('/:id/members', requireAuth, addMember);
r.post('/:id/join', requireAuth, joinGroup);

// Balances & Minimal Transfers
r.get('/:id/balances', getBalances);
r.get('/:id/transfers', getTransfers);

// Group Expenses
r.get('/:id/expenses', listExpenses);
r.post('/:id/expenses', requireAuth, createExpense);

// Expense Deletion Requests & Peer Approval Workflow
r.get('/:id/expense-deletion-requests', requireAuth, listExpenseDeletionRequests);
r.post('/:id/expenses/:expenseId/request-deletion', requireAuth, createExpenseDeletionRequest);
r.post('/:id/expense-deletion-requests/:requestId/approve', requireAuth, approveExpenseDeletionRequest);
r.post('/:id/expense-deletion-requests/:requestId/reject', requireAuth, rejectExpenseDeletionRequest);

// Group Settlements
r.get('/:id/settlements', listSettlements);
r.post('/:id/settlements', requireAuth, createSettlement);

// Settlement Requests & Peer Approval Workflow
r.get('/:id/settlement-requests', listSettlementRequests);
r.post('/:id/settlement-requests', requireAuth, createSettlementRequest);
r.post('/:id/settlement-requests/:requestId/approve', requireAuth, approveSettlementRequest);
r.post('/:id/settlement-requests/:requestId/reject', requireAuth, rejectSettlementRequest);

// Real-Time Group Chat
r.get('/:id/chat', optionalAuth, listChatMessages);
r.post('/:id/chat', requireAuth, sendChatMessage);

// Notifications & Activity Feed
r.get('/:id/notifications', listNotifications);
r.get('/:id/activity', listActivity);

// Group Reports
r.get('/:id/reports', getReports);

export default r;
