import Group from '../models/Group.js';
import Expense from '../models/Expense.js';
import ExpenseDeletionRequest from '../models/ExpenseDeletionRequest.js';
import { emitToGroup, createAndBroadcastNotification } from '../src/socket.js';
import { recordAuditLog } from '../src/audit.js';

/**
 * List all deletion requests for a group
 */
export async function listExpenseDeletionRequests(req, res, next) {
  try {
    const groupId = req.params.groupId || req.params.id;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isMember = String(group.ownerId) === String(req.user._id) ||
      group.members.some((m) => m.userId && String(m.userId) === String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ error: 'You must be a member of this group to view deletion requests' });
    }

    const requests = await ExpenseDeletionRequest.find({ groupId })
      .sort('-createdAt')
      .limit(50);

    res.json(requests);
  } catch (err) {
    next(err);
  }
}

/**
 * Request peer approval to delete an expense entry
 */
export async function createExpenseDeletionRequest(req, res, next) {
  try {
    const groupId = req.params.groupId || req.params.id;
    const { expenseId } = req.params;
    const { reason = '' } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isMember = String(group.ownerId) === String(req.user._id) ||
      group.members.some((m) => m.userId && String(m.userId) === String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ error: 'You must be a member of this group to request expense deletion' });
    }

    const expense = await Expense.findOne({ _id: expenseId, groupId });
    if (!expense) return res.status(404).json({ error: 'Expense not found in this group' });

    // Check if there is already a pending deletion request for this expense
    const existingPending = await ExpenseDeletionRequest.findOne({
      expenseId: expense._id,
      status: 'pending'
    });
    if (existingPending) {
      return res.status(400).json({ error: 'A deletion request for this expense is already pending peer approval' });
    }

    const request = await ExpenseDeletionRequest.create({
      groupId: group._id,
      expenseId: expense._id,
      expenseTitle: expense.title,
      expenseAmount: expense.amount,
      requesterId: req.user._id,
      requesterName: req.user.name,
      reason: reason?.trim() || '',
      status: 'pending',
      approvals: []
    });

    const rupeeAmount = (expense.amount / 100).toFixed(2).replace(/\.00$/, '');
    const notificationMsg = `${req.user.name} requested deletion of expense "${expense.title}" (₹${rupeeAmount})`;

    // Broadcast real-time notification
    await createAndBroadcastNotification({
      groupId: group._id,
      type: 'expense_deletion_requested',
      actorId: req.user._id,
      actorName: req.user.name,
      message: notificationMsg,
      metadata: { requestId: request._id, expenseId: expense._id, amount: expense.amount }
    });

    // Record immutable audit log
    await recordAuditLog({
      action: 'expense_deletion_requested',
      actorId: req.user._id,
      actorName: req.user.name,
      groupId: group._id,
      payload: { requestId: request._id, expenseId: expense._id, title: expense.title, amount: expense.amount }
    });

    emitToGroup(group._id, 'expense_deletion_request:created', request);

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
}

/**
 * Approve an expense deletion request (Peer verification rule)
 */
export async function approveExpenseDeletionRequest(req, res, next) {
  try {
    const groupId = req.params.groupId || req.params.id;
    const { requestId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isMember = String(group.ownerId) === String(req.user._id) ||
      group.members.some((m) => m.userId && String(m.userId) === String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ error: 'You must be a member of this group to approve this request' });
    }

    const request = await ExpenseDeletionRequest.findOne({ _id: requestId, groupId });
    if (!request) return res.status(404).json({ error: 'Deletion request not found' });

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Deletion request has already been ${request.status}` });
    }

    // FINANCIAL INTEGRITY RULE: Requester cannot self-approve
    if (String(request.requesterId) === String(req.user._id)) {
      return res.status(403).json({
        error: 'You cannot approve your own expense deletion request. Another group member must approve it.'
      });
    }

    // INTEGRITY RULE: Duplicate approval prevention
    const alreadyApproved = request.approvals.some((a) => String(a.userId) === String(req.user._id));
    if (alreadyApproved) {
      return res.status(400).json({ error: 'You have already approved this deletion request' });
    }

    // Add peer approval
    request.approvals.push({
      userId: req.user._id,
      userName: req.user.name,
      approvedAt: new Date()
    });
    request.status = 'approved';
    await request.save();

    // Officially delete the Expense from the database
    const deletedExpense = await Expense.findByIdAndDelete(request.expenseId);

    const rupeeAmount = (request.expenseAmount / 100).toFixed(2).replace(/\.00$/, '');
    const notificationMsg = `${req.user.name} approved deletion of "${request.expenseTitle}" (₹${rupeeAmount}). Expense removed.`;

    // Real-time notification
    await createAndBroadcastNotification({
      groupId: group._id,
      type: 'expense_deletion_approved',
      actorId: req.user._id,
      actorName: req.user.name,
      message: notificationMsg,
      metadata: { requestId: request._id, expenseId: request.expenseId }
    });

    // Record immutable audit logs for deletion approval and payment removal
    await recordAuditLog({
      action: 'expense_deletion_approved',
      actorId: req.user._id,
      actorName: req.user.name,
      groupId: group._id,
      payload: {
        requestId: request._id,
        expenseId: request.expenseId,
        title: request.expenseTitle,
        amount: request.expenseAmount,
        requesterId: request.requesterId,
        requesterName: request.requesterName
      }
    });

    await recordAuditLog({
      action: 'payment_deleted',
      actorId: req.user._id,
      actorName: req.user.name,
      groupId: group._id,
      payload: {
        expenseId: request.expenseId,
        title: request.expenseTitle,
        amount: request.expenseAmount,
        approvedBy: req.user.name
      }
    });

    // Broadcast socket event so all clients update balance calculations immediately
    emitToGroup(group._id, 'expense:deleted', request.expenseId);
    emitToGroup(group._id, 'expense_deletion_request:updated', request);

    res.json({
      message: 'Expense deletion approved and removed successfully',
      request,
      deletedExpenseId: request.expenseId
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Reject an expense deletion request
 */
export async function rejectExpenseDeletionRequest(req, res, next) {
  try {
    const groupId = req.params.groupId || req.params.id;
    const { requestId } = req.params;
    const { reason = '' } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isMember = String(group.ownerId) === String(req.user._id) ||
      group.members.some((m) => m.userId && String(m.userId) === String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ error: 'You must be a member of this group to reject this request' });
    }

    const request = await ExpenseDeletionRequest.findOne({ _id: requestId, groupId });
    if (!request) return res.status(404).json({ error: 'Deletion request not found' });

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Deletion request has already been ${request.status}` });
    }

    request.status = 'rejected';
    request.rejectionReason = reason?.trim() || 'Rejected by peer';
    await request.save();

    const notificationMsg = `${req.user.name} rejected deletion of expense "${request.expenseTitle}"`;

    await createAndBroadcastNotification({
      groupId: group._id,
      type: 'expense_deletion_rejected',
      actorId: req.user._id,
      actorName: req.user.name,
      message: notificationMsg,
      metadata: { requestId: request._id, expenseId: request.expenseId }
    });

    await recordAuditLog({
      action: 'expense_deletion_rejected',
      actorId: req.user._id,
      actorName: req.user.name,
      groupId: group._id,
      payload: { requestId: request._id, expenseId: request.expenseId, title: request.expenseTitle }
    });

    emitToGroup(group._id, 'expense_deletion_request:updated', request);

    res.json({
      message: 'Expense deletion request rejected',
      request
    });
  } catch (err) {
    next(err);
  }
}
