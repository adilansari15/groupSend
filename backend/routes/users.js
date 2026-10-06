import { Router } from 'express';
import { searchUsers } from '../controllers/users.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();

// Search registered & verified users
r.get('/search', requireAuth, searchUsers);

export default r;
