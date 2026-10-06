import mongoose from 'mongoose';

const approvalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  approvedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const settlementRequestSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requesterName: {
    type: String,
    required: true
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  fromName: {
    type: String,
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  toName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1 // Integer paise
  },
  note: {
    type: String,
    default: '',
    maxlength: 200
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  approvals: [approvalSchema],
  settlementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Settlement',
    default: null
  }
}, { timestamps: true });

settlementRequestSchema.index({ groupId: 1, status: 1 });

export default mongoose.model('SettlementRequest', settlementRequestSchema);
