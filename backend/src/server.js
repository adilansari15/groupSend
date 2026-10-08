import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '../.env' });
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDB } from '../config/db.js';
import { initSocket } from './socket.js';
import groups from '../routes/groups.js';
import expenses from '../routes/expenses.js';
import auth from '../routes/auth.js';
import users from '../routes/users.js';
import { errorHandler } from '../middleware/error.js';

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(url => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const corsOriginChecker = (origin, callback) => {
  // Allow requests with no origin (like mobile apps, curl, or server-to-server)
  if (!origin) return callback(null, true);
  const cleanOrigin = origin.replace(/\/+$/, '');
  if (
    allowedOrigins.includes('*') ||
    allowedOrigins.includes(cleanOrigin) ||
    (allowedOrigins.some(ao => ao.includes('.vercel.app')) && cleanOrigin.endsWith('.vercel.app'))
  ) {
    return callback(null, true);
  }
  return callback(null, false);
};

app.use(cors({
  origin: corsOriginChecker,
  credentials: true
}));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: corsOriginChecker,
    methods: ['GET', 'POST'],
    credentials: true
  }
});
initSocket(io);

app.get('/api/health', (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));
app.use('/api/groups', groups);
app.use('/api/expenses', expenses);
app.use('/api/auth', auth);
app.use('/api/users', users);

app.use(errorHandler);

// If run directly
if (process.env.NODE_ENV !== 'test') {
  await connectDB(process.env.MONGODB_URI);
  const port = process.env.PORT || 5000;
  server.listen(port, () => console.log(`API running on port ${port}`));
}

export default app;
