import mongoose from 'mongoose';

export default mongoose.model('Settlement', new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  from: { type: mongoose.Schema.Types.ObjectId, required: true },
  to: { type: mongoose.Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true, min: 1, max: 10000000000 }, // paise
  date: { type: Date, default: Date.now },
}));
