import Group from '../models/Group.js';
import Settlement from '../models/Settlement.js';
import SettlementRequest from '../models/SettlementRequest.js';
import { emitToGroup, createAndBroadcastNotification, postSystemChatMessage } from '../src/socket.js';
import { recordAuditLog } from '../src/audit.js';

export async function listSettlementRequests(req, res, next) {
  try {
    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const requests = await SettlementRequest.find({ groupId: id })
      .sort('-createdAt')
      .lean();

    res.json(requests);
  } catch (err) {
    next(err);
  }
}

export async function createSettlementRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { from, to, amount, note = '' } = req.body;

    if (!from || !to) {
      return res.status(400).json({ error: 'Both from and to members are required' });
    }
    if (String(from) === String(to)) {
      return res.status(400).json({ error: 'Payer and receiver cannot be the same member' });
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive integer in paise' });
    }

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Validate requester is a member of the group
    const isMember = String(group.ownerId) === String(req.user._id) ||
      group.members.some((m) => m.userId && String(m.userId) === String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ error: 'Only group members can request settlements' });
    }

    const memberMap = Object.fromEntries(group.members.map((m) => [String(m._id), m.name]));
    if (!memberMap[String(from)]) {
      return res.status(400).json({ error: 'Payer is not a valid member in this group' });
    }
    if (!memberMap[String(to)]) {
      return res.status(400).json({ error: 'Receiver is not a valid member in this group' });
    }

    const request = await SettlementRequest.create({
      groupId: group._id,
      requesterId: req.user._id,
      requesterName: req.user.name,
      from,
      fromName: memberMap[String(from)],
      to,
      toName: memberMap[String(to)],
      amount,
      note: typeof note === 'string' ? note.trim() : '',
      status: 'pending',
      approvals: []
    });

    const rupeeAmount = (amount / 100).toFixed(2).replace(/\.00$/, '');
    const notificationMessage = `${req.user.name} requested settlement of ₹${rupeeAmount} (${memberMap[String(from)]} → ${memberMap[String(to)]})`;

    // Real-time broadcast and notification
    await createAndBroadcastNotification({
      groupId: group._id,
      type: 'settlement_requested',
      actorId: req.user._id,
      actorName: req.user.name,
      message: notificationMessage,
      metadata: { requestId: request._id, amount }
    });

    // Immutable audit log
    await recordAuditLog({
      action: 'settlement_requested',
      actorId: req.user._id,
      actorName: req.user.name,
      groupId: group._id,
      payload: { requestId: request._id, from: memberMap[String(from)], to: memberMap[String(to)], amount }
    });

    emitToGroup(group._id, 'settlement_request:created', request);

    // System chat message
    const rupeeAmountChat = (amount / 100).toFixed(2).replace(/\.00$/, '');
    await postSystemChatMessage(
      group._id,
      `💳 ${req.user.name} requested a settlement of ₹${rupeeAmountChat} (${memberMap[String(from)]} → ${memberMap[String(to)]})`
    );

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
}

export async function approveSettlementRequest(req, res, next) {
  try {
    const { id, requestId } = req.params;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Validate approver is a member
    const isMember = String(group.ownerId) === String(req.user._id) ||
      group.members.some((m) => m.userId && String(m.userId) === String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ error: 'Only group members can approve settlements' });
    }

    const request = await SettlementRequest.findOne({ _id: requestId, groupId: id });
    if (!request) return res.status(404).json({ error: 'Settlement request not found' });

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Settlement request is already ${request.status}` });
    }

    // STRICT INTEGRITY REQUIREMENT 1: Requester cannot approve their own request
    if (String(request.requesterId) === String(req.user._id)) {
      return res.status(403).json({
        error: 'Integrity rule violation: You cannot approve your own settlement request. Peer approval is required.'
      });
    }

    // STRICT INTEGRITY REQUIREMENT 2: Duplicate approvals prevented
    const alreadyApproved = request.approvals.some((a) => String(a.userId) === String(req.user._id));
    if (alreadyApproved) {
      return res.status(400).json({ error: 'You have already approved this settlement request' });
    }

    // Record approval
    request.approvals.push({
      userId: req.user._id,
      userName: req.user.name,
      approvedAt: new Date()
    });

    // Mark approved
    request.status = 'approved';

    // Create official Settlement document to update balances
    const settlement = await Settlement.create({
      groupId: group._id,
      from: request.from,
      to: request.to,
      amount: request.amount,
      date: new Date()
    });

    request.settlementId = settlement._id;
    await request.save();

    const rupeeAmount = (request.amount / 100).toFixed(2).replace(/\.00$/, '');
    const notificationMessage = `${req.user.name} approved ${request.requesterName}'s settlement of ₹${rupeeAmount}`;

    // Notification broadcast
    await createAndBroadcastNotification({
      groupId: group._id,
      type: 'settlement_approved',
      actorId: req.user._id,
      actorName: req.user.name,
      message: notificationMessage,
      metadata: { requestId: request._id, settlementId: settlement._id }
    });

    // Completion notification
    await createAndBroadcastNotification({
      groupId: group._id,
      type: 'settlement_completed',
      actorId: req.user._id,
      actorName: req.user.name,
      message: `Settlement of ₹${rupeeAmount} (${request.fromName} → ${request.toName}) completed successfully`,
      metadata: { requestId: request._id, settlementId: settlement._id }
    });

    // Audit logs
    await recordAuditLog({
      action: 'settlement_approved',
      actorId: req.user._id,
      actorName: req.user.name,
      groupId: group._id,
      payload: { requestId: request._id, approvedBy: req.user.name }
    });

    await recordAuditLog({
      action: 'settlement_completed',
      actorId: req.user._id,
      actorName: req.user.name,
      groupId: group._id,
      payload: { settlementId: settlement._id, amount: request.amount, from: request.fromName, to: request.toName }
    });

    // Sockets
    const memberMap = Object.fromEntries(group.members.map((m) => [String(m._id), m.name]));
    const populatedSettlement = {
      ...settlement.toObject(),
      fromName: memberMap[String(settlement.from)] || 'Unknown',
      toName: memberMap[String(settlement.to)] || 'Unknown'
    };

    emitToGroup(group._id, 'settlement:created', populatedSettlement);
    emitToGroup(group._id, 'settlement_request:updated', request);

    // System chat message
    const rupeeAmountChat2 = (request.amount / 100).toFixed(2).replace(/\.00$/, '');
    await postSystemChatMessage(
      group._id,
      `✅ ${req.user.name} approved and completed a settlement of ₹${rupeeAmountChat2} (${request.fromName} → ${request.toName})`
    );

    res.json({
      message: 'Settlement request approved and recorded successfully',
      request,
      settlement: populatedSettlement
    });
  } catch (err) {
    next(err);
  }
}

export async function rejectSettlementRequest(req, res, next) {
  try {
    const { id, requestId } = req.params;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Validate membership
    const isMember = String(group.ownerId) === String(req.user._id) ||
      group.members.some((m) => m.userId && String(m.userId) === String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ error: 'Only group members can reject settlements' });
    }

    const request = await SettlementRequest.findOne({ _id: requestId, groupId: id });
    if (!request) return res.status(404).json({ error: 'Settlement request not found' });

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Settlement request is already ${request.status}` });
    }

    request.status = 'rejected';
    await request.save();

    const rupeeAmount = (request.amount / 100).toFixed(2).replace(/\.00$/, '');
    const notificationMessage = `${req.user.name} rejected ${request.requesterName}'s settlement request of ₹${rupeeAmount}`;

    await createAndBroadcastNotification({
      groupId: group._id,
      type: 'settlement_rejected',
      actorId: req.user._id,
      actorName: req.user.name,
      message: notificationMessage,
      metadata: { requestId: request._id }
    });

    await recordAuditLog({
      action: 'settlement_rejected',
      actorId: req.user._id,
      actorName: req.user.name,
      groupId: group._id,
      payload: { requestId: request._id, rejectedBy: req.user.name }
    });

    emitToGroup(group._id, 'settlement_request:updated', request);

    // System chat message
    const rupeeAmountChat3 = (request.amount / 100).toFixed(2).replace(/\.00$/, '');
    await postSystemChatMessage(
      group._id,
      `❌ ${req.user.name} rejected the settlement request of ₹${rupeeAmountChat3} (${request.fromName} → ${request.toName})`
    );

    res.json({ message: 'Settlement request rejected', request });
  } catch (err) {
    next(err);
  }
}
