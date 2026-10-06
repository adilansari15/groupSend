import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, me, verifyEmail, resendVerification } from '../controllers/auth.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again after 15 minutes' }
});

r.post('/register', authLimiter, register);
r.post('/login', authLimiter, login);
r.post('/verify-email', authLimiter, verifyEmail);
r.post('/resend-verification', authLimiter, resendVerification);
r.post('/logout', logout);
r.get('/me', requireAuth, me);

export default r;
