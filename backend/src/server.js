import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDB } from '../config/db.js';
import { initSocket } from './socket.js';
import groups from '../routes/groups.js';
import expenses from '../routes/expenses.js';
import auth from '../routes/auth.js';
import { errorHandler } from '../middleware/error.js';

const app = express();
const server = http.createServer(app);

const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: clientOrigin,
  credentials: true
}));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});
initSocket(io);

app.get('/api/health', (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));
app.use('/api/groups', groups);
app.use('/api/expenses', expenses);
app.use('/api/auth', auth);

app.use(errorHandler);

// If run directly
if (process.env.NODE_ENV !== 'test') {
  await connectDB(process.env.MONGODB_URI);
  const port = process.env.PORT || 5000;
  server.listen(port, () => console.log(`API running on port ${port}`));
}

export default app;
