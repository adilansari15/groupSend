import Group from '../models/Group.js';
import Expense from '../models/Expense.js';
import { validateExpense } from '../src/settlement.js';
import { emitToGroup, createAndBroadcastNotification } from '../src/socket.js';
import { recordAuditLog } from '../src/audit.js';

export async function listExpenses(req, res, next) {
  try {
    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const expenses = await Expense.find({ groupId: id }).sort('-date -createdAt');
    res.json(expenses);
  } catch (err) {
    next(err);
  }
}

export async function createExpense(req, res, next) {
  try {
    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const { title, amount, category = 'Other', date = Date.now(), notes = '', payments = [], shares = [] } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Expense title is required' });
    }

    const groupMemberIdSet = new Set(group.members.map((m) => String(m._id)));

    // Ensure memberIds in payments and shares are valid members of the group
    for (const p of payments) {
      if (!groupMemberIdSet.has(String(p.memberId))) {
        return res.status(400).json({ error: `Member ${p.memberId} in payments is not in the group` });
      }
    }
    for (const s of shares) {
      if (!groupMemberIdSet.has(String(s.memberId))) {
        return res.status(400).json({ error: `Member ${s.memberId} in shares is not in the group` });
      }
    }

    // Pure validation logic from settlement.js
    try {
      validateExpense(amount, payments, shares);
    } catch (valErr) {
      return res.status(400).json({ error: valErr.message });
    }

    const expense = await Expense.create({
      groupId: group._id,
      title: title.trim(),
      amount,
      category,
      date,
      notes: notes?.trim() || '',
      payments,
      shares
    });

    const actorName = req.user?.name || 'Someone';
    const rupeeAmount = (amount / 100).toFixed(2).replace(/\.00$/, '');
    const notificationMsg = `${actorName} added ₹${rupeeAmount} for ${expense.title}`;

    // Notification broadcast
    await createAndBroadcastNotification({
      groupId: group._id,
      type: 'expense_created',
      actorId: req.user?._id || null,
      actorName,
      message: notificationMsg,
      metadata: { expenseId: expense._id, amount, title: expense.title }
    });

    // Immutable audit log
    await recordAuditLog({
      action: 'payment_created',
      actorId: req.user?._id || null,
      actorName,
      groupId: group._id,
      payload: { expenseId: expense._id, title: expense.title, amount, category }
    });

    emitToGroup(group._id, 'expense:created', expense);

    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
}

export async function deleteExpense(req, res, next) {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const group = await Group.findById(expense.groupId);
    if (group && group.ownerId) {
      const requesterId = req.userId || req.user?._id;
      if (requesterId) {
        const isMemberOrOwner = String(group.ownerId) === String(requesterId) ||
          group.members.some((m) => m.userId && String(m.userId) === String(requesterId));
        if (!isMemberOrOwner) {
          return res.status(403).json({ error: 'Unauthorized to delete expenses in this group' });
        }
      }
    }

    await Expense.findByIdAndDelete(expense._id);

    const actorName = req.user?.name || 'Someone';
    const rupeeAmount = (expense.amount / 100).toFixed(2).replace(/\.00$/, '');
    const notificationMsg = `${actorName} deleted expense "${expense.title}" (₹${rupeeAmount})`;

    await createAndBroadcastNotification({
      groupId: expense.groupId,
      type: 'expense_deleted',
      actorId: req.user?._id || null,
      actorName,
      message: notificationMsg,
      metadata: { expenseId: expense._id, title: expense.title }
    });

    await recordAuditLog({
      action: 'payment_deleted',
      actorId: req.user?._id || null,
      actorName,
      groupId: expense.groupId,
      payload: { expenseId: expense._id, title: expense.title, amount: expense.amount }
    });

    emitToGroup(expense.groupId, 'expense:deleted', expense._id);

    res.json({ message: 'Expense deleted successfully', id: expense._id });
  } catch (err) {
    next(err);
  }
}
