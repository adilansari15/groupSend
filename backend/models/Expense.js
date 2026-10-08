import mongoose from 'mongoose';

// All amounts are integer paise.
const line = { memberId: { type: mongoose.Schema.Types.ObjectId, required: true }, amount: { type: Number, required: true, min: 0 } };

const expenseSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  amount: { type: Number, required: true, min: 1, max: 10000000000 },
  category: { type: String, default: 'Other', maxlength: 50 },
  date: { type: Date, default: Date.now },
  notes: { type: String, default: '', maxlength: 1000 },
  payments: [line],
  shares: [line],
}, { timestamps: true });

expenseSchema.index({ groupId: 1, date: -1, createdAt: -1 });

export default mongoose.model('Expense', expenseSchema);
