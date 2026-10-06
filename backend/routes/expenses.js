import { Router } from 'express';
import { deleteExpense } from '../controllers/expenses.js';
import { optionalAuth } from '../middleware/auth.js';

const r = Router();

r.delete('/:id', optionalAuth, deleteExpense);

export default r;
