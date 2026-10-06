// Run from backend/ so dependencies resolve: cd backend && node ../scripts/seed.js
import 'dotenv/config';
import mongoose from 'mongoose';
import Group from '../backend/models/Group.js';
import Expense from '../backend/models/Expense.js';
import Settlement from '../backend/models/Settlement.js';
import { splitEqual } from '../backend/src/settlement.js';

await mongoose.connect(process.env.MONGODB_URI);
await Promise.all([Group.deleteMany({}), Expense.deleteMany({}), Settlement.deleteMany({})]);
const g = await Group.create({ name: 'Hostel Group', description: 'Demo data', members: ['Aditya Pandey', 'Arunkumar Chaudhary', 'Rohan Verma', 'Ayush Singh'].map((name) => ({ name })) });
const ids = g.members.map((m) => m._id);
const paid = [300, 400, 0, 300];
await Expense.create({ groupId: g._id, title: 'party', amount: 100000, category: 'Food',
  payments: ids.map((memberId, i) => ({ memberId, amount: paid[i] * 100 })), shares: splitEqual(100000, ids) });
console.log('Seeded', g.name);
await mongoose.disconnect();
