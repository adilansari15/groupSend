import Group from '../models/Group.js';
import Settlement from '../models/Settlement.js';
import { emitToGroup, createAndBroadcastNotification, postSystemChatMessage } from '../src/socket.js';
import { recordAuditLog } from '../src/audit.js';

export async function listSettlements(req, res, next) {
  try {
    const { id } = req.params;
    const group = req.group || (await Group.findById(id));
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const settlements = await Settlement.find({ groupId: id }).sort('-date -createdAt').lean();
    const memberMap = Object.fromEntries(group.members.map((m) => [String(m._id), m.name]));

    const populated = settlements.map((s) => ({
      ...s,
      fromName: memberMap[String(s.from)] || 'Unknown',
      toName: memberMap[String(s.to)] || 'Unknown'
    }));

    res.json(populated);
  } catch (err) {
    next(err);
  }
}

export async function createSettlement(req, res, next) {
  try {
    const { id } = req.params;
    const group = req.group || (await Group.findById(id));
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const { from, to, amount, date = Date.now() } = req.body;

    if (!from || !to) {
      return res.status(400).json({ error: 'Both from and to members are required' });
    }
    if (String(from) === String(to)) {
      return res.status(400).json({ error: 'Payer and receiver cannot be the same member' });
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive integer in paise' });
    }

    const groupMemberIdSet = new Set(group.members.map((m) => String(m._id)));
    if (!groupMemberIdSet.has(String(from))) {
      return res.status(400).json({ error: 'Payer is not a member of this group' });
    }
    if (!groupMemberIdSet.has(String(to))) {
      return res.status(400).json({ error: 'Receiver is not a member of this group' });
    }

    const settlement = await Settlement.create({
      groupId: group._id,
      from,
      to,
      amount,
      date
    });

    const memberMap = Object.fromEntries(group.members.map((m) => [String(m._id), m.name]));
    const result = {
      ...settlement.toObject(),
      fromName: memberMap[String(from)] || 'Unknown',
      toName: memberMap[String(to)] || 'Unknown'
    };

    emitToGroup(group._id, 'settlement:created', result);

    const actorName = req.user?.name || 'Someone';
    const rupeeAmount = (amount / 100).toFixed(2).replace(/\.00$/, '');

    // Notification broadcast
    await createAndBroadcastNotification({
      groupId: group._id,
      type: 'settlement_completed',
      actorId: req.user?._id || null,
      actorName,
      message: `${actorName} settled ₹${rupeeAmount} (${result.fromName} → ${result.toName})`,
      metadata: { settlementId: settlement._id, amount }
    });

    // Audit log
    await recordAuditLog({
      action: 'settlement_completed',
      actorId: req.user?._id || null,
      actorName,
      groupId: group._id,
      payload: { settlementId: settlement._id, from: result.fromName, to: result.toName, amount }
    });

    // System chat message so everyone sees it in the group chat
    await postSystemChatMessage(
      group._id,
      `✅ ${actorName} settled \u20b9${rupeeAmount} from ${result.fromName} to ${result.toName}`
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
