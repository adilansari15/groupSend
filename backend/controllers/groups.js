import Group from '../models/Group.js';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';
import { balances, transfers } from '../src/settlement.js';

export const listGroups = async (_req, res, next) => {
  try {
    const groups = await Group.find().sort('-createdAt');
    res.json(groups);
  } catch (err) {
    next(err);
  }
};

export async function getGroup(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
  } catch (err) {
    next(err);
  }
}

export async function createGroup(req, res, next) {
  try {
    const { name, description, members = [] } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Group name is required' });

    const memberObjects = members.map((m) => {
      if (typeof m === 'string') return { name: m.trim() };
      return { name: m.name?.trim(), userId: m.userId || null };
    }).filter((m) => Boolean(m.name));

    // If authenticated user is creating, link ownerId and ensure user is a member
    const ownerId = req.userId || req.user?._id || null;
    if (ownerId && req.user?.name) {
      const alreadyIncluded = memberObjects.some(
        (m) => m.name.toLowerCase() === req.user.name.toLowerCase() || String(m.userId) === String(ownerId)
      );
      if (!alreadyIncluded) {
        memberObjects.unshift({ name: req.user.name, userId: ownerId });
      }
    }

    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || '',
      ownerId,
      members: memberObjects,
    });
    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
}

export async function deleteGroup(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Authorization check: If group has an owner, only the owner can delete it
    if (group.ownerId) {
      const requesterId = req.userId || req.user?._id;
      if (!requesterId || String(group.ownerId) !== String(requesterId)) {
        return res.status(403).json({ error: 'Only the group owner can delete this group' });
      }
    }

    await Promise.all([
      Group.findByIdAndDelete(group._id),
      Expense.deleteMany({ groupId: group._id }),
      Settlement.deleteMany({ groupId: group._id })
    ]);

    res.json({ message: 'Group deleted successfully', id: group._id });
  } catch (err) {
    next(err);
  }
}

export async function addMember(req, res, next) {
  try {
    const { name, userId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Member name is required' });

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const newMember = { name: name.trim(), userId: userId || null };
    group.members.push(newMember);
    await group.save();

    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
}

export async function joinGroup(req, res, next) {
  try {
    const { name, memberId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const userId = req.userId || req.user?._id || null;

    if (memberId) {
      const target = group.members.id(memberId);
      if (target) {
        if (target.userId && String(target.userId) !== String(userId)) {
          return res.status(400).json({ error: 'Member is already linked to another account' });
        }
        target.userId = userId;
        await group.save();
        return res.json({ message: 'Linked successfully', group });
      }
    }

    const memberName = name?.trim() || req.user?.name || 'New Member';
    const existing = group.members.find((m) => m.name.toLowerCase() === memberName.toLowerCase());
    if (existing) {
      if (userId && !existing.userId) {
        existing.userId = userId;
        await group.save();
        return res.json({ message: 'Linked to existing member', group });
      }
      return res.status(400).json({ error: 'Member already in group' });
    }

    group.members.push({ name: memberName, userId });
    await group.save();
    res.status(201).json({ message: 'Joined successfully', group });
  } catch (err) {
    next(err);
  }
}

export async function getBalances(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const [expenses, settlements] = await Promise.all([
      Expense.find({ groupId: group._id }).lean(),
      Settlement.find({ groupId: group._id }).lean()
    ]);

    const ids = group.members.map((m) => String(m._id));
    const norm = (a) => a.map((x) => ({ ...x, memberId: String(x.memberId) }));
    const ex = expenses.map((e) => ({ payments: norm(e.payments), shares: norm(e.shares) }));
    const st = settlements.map((s) => ({ from: String(s.from), to: String(s.to), amount: s.amount }));

    const bal = balances(ids, ex, st);
    const memberBalances = group.members.map((m) => ({
      memberId: String(m._id),
      name: m.name,
      userId: m.userId,
      netBalance: bal[String(m._id)] || 0
    }));

    res.json({ balances: bal, members: memberBalances });
  } catch (err) {
    next(err);
  }
}

export async function getTransfers(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const [expenses, settlements] = await Promise.all([
      Expense.find({ groupId: group._id }).lean(),
      Settlement.find({ groupId: group._id }).lean()
    ]);

    const ids = group.members.map((m) => String(m._id));
    const memberMap = Object.fromEntries(group.members.map((m) => [String(m._id), m.name]));

    const norm = (a) => a.map((x) => ({ ...x, memberId: String(x.memberId) }));
    const ex = expenses.map((e) => ({ payments: norm(e.payments), shares: norm(e.shares) }));
    const st = settlements.map((s) => ({ from: String(s.from), to: String(s.to), amount: s.amount }));

    const rawTransfers = transfers(balances(ids, ex, st));
    const populatedTransfers = rawTransfers.map((t) => ({
      ...t,
      fromName: memberMap[t.from] || 'Unknown',
      toName: memberMap[t.to] || 'Unknown'
    }));

    res.json(populatedTransfers);
  } catch (err) {
    next(err);
  }
}
