import Group from '../models/Group.js';
import Expense from '../models/Expense.js';
import { validateExpense } from '../src/settlement.js';
import { emitToGroup, createAndBroadcastNotification, postSystemChatMessage } from '../src/socket.js';
import { recordAuditLog } from '../src/audit.js';

export async function listExpenses(req, res, next) {
  try {
    const { id } = req.params;
    const group = req.group || (await Group.findById(id));
    if (!group) return res.status(404).json({ error: 'Group not found' });

    let query = Expense.find({ groupId: id }).sort('-date -createdAt').lean();

    // Optional pagination support
    if (req.query.limit) {
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      query = query.skip((page - 1) * limit).limit(limit);
    }

    const expenses = await query;
    res.json(expenses);
  } catch (err) {
    next(err);
  }
}

export async function createExpense(req, res, next) {
  try {
    const { id } = req.params;
    const group = req.group || (await Group.findById(id));
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

    // System chat message so everyone sees it in the group chat
    await postSystemChatMessage(
      group._id,
      `💸 ${actorName} added a payment of ₹${rupeeAmount} for "${expense.title}"`
    );

    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
}

export async function deleteExpense(req, res, next) {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    // FINANCIAL INTEGRITY RULE: Unilateral deletion is disallowed. Peer approval is mandatory.
    return res.status(403).json({
      error: 'Unilateral deletion is disabled to maintain financial integrity. Please submit an expense deletion request for peer approval.'
    });
  } catch (err) {
    next(err);
  }
}
