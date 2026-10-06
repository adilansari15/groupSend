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
import { listExpenses, createExpense } from '../controllers/expenses.js';
import { listSettlements, createSettlement } from '../controllers/settlements.js';
import { getReports } from '../controllers/reports.js';
import { optionalAuth } from '../middleware/auth.js';

const r = Router();

// Groups & Members
r.get('/', listGroups);
r.post('/', optionalAuth, createGroup);
r.get('/:id', getGroup);
r.delete('/:id', optionalAuth, deleteGroup);
r.post('/:id/members', addMember);
r.post('/:id/join', optionalAuth, joinGroup);

// Balances & Minimal Transfers
r.get('/:id/balances', getBalances);
r.get('/:id/transfers', getTransfers);

// Group Expenses
r.get('/:id/expenses', listExpenses);
r.post('/:id/expenses', createExpense);

// Group Settlements
r.get('/:id/settlements', listSettlements);
r.post('/:id/settlements', createSettlement);

// Group Reports
r.get('/:id/reports', getReports);

export default r;
