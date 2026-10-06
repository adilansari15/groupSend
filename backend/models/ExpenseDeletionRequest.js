import mongoose from 'mongoose';

const expenseDeletionRequestSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: true,
    index: true
  },
  expenseTitle: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  expenseAmount: {
    type: Number,
    required: true,
    min: 1
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requesterName: {
    type: String,
    required: true,
    trim: true
  },
  reason: {
    type: String,
    default: '',
    trim: true,
    maxlength: 250
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  approvals: [{
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
  }],
  rejectionReason: {
    type: String,
    default: ''
  }
}, { timestamps: true });

expenseDeletionRequestSchema.index({ groupId: 1, status: 1 });
expenseDeletionRequestSchema.index({ expenseId: 1, status: 1 });

export default mongoose.model('ExpenseDeletionRequest', expenseDeletionRequestSchema);
