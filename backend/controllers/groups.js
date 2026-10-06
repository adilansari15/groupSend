import mongoose from 'mongoose';
import Group from '../models/Group.js';
import User from '../models/User.js';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';
import { balances, transfers } from '../src/settlement.js';
import { createAndBroadcastNotification } from '../src/socket.js';
import { recordAuditLog } from '../src/audit.js';

/**
 * Validates that a prospective group member is a real, registered, and email-verified user.
 * Throws specific error messages matching business requirements.
 */
export async function validateVerifiedUser(identifier) {
  if (!identifier) {
    const err = new Error('Member identifier (userId or email) is required');
    err.statusCode = 400;
    throw err;
  }

  let user = null;

  // Search by ObjectId or email
  if (typeof identifier === 'object') {
    const candidateId = identifier.userId || identifier._id || identifier.id;
    const candidateEmail = identifier.email;

    if (candidateId && mongoose.isValidObjectId(candidateId)) {
      user = await User.findById(candidateId);
    } else if (candidateEmail && typeof candidateEmail === 'string') {
      user = await User.findOne({ email: candidateEmail.trim().toLowerCase() });
    }
  } else if (typeof identifier === 'string') {
    const trimmed = identifier.trim();
    if (mongoose.isValidObjectId(trimmed)) {
      user = await User.findById(trimmed);
    }
    if (!user) {
      user = await User.findOne({ email: trimmed.toLowerCase() });
    }
  }

  // 1. Verify user exists in MongoDB
  if (!user) {
    const err = new Error('User must register first');
    err.statusCode = 404;
    throw err;
  }

  // 2. Verify user has verified their email
  if (!user.isVerified) {
    const err = new Error('User must verify email first');
    err.statusCode = 400;
    throw err;
  }

  return {
    userId: user._id,
    name: user.name,
    email: user.email
  };
}

export const listGroups = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.userId;
    let query = {};
    if (userId) {
      // Find groups where user is owner or member
      query = {
        $or: [
          { ownerId: userId },
          { 'members.userId': userId }
        ]
      };
    }
    const groups = await Group.find(query).sort('-createdAt');
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

/**
 * Creates a new group.
 * Strictly verifies ALL members:
 * - Creator is automatically added as member #1.
 * - Every additional member must be a registered, verified user.
 * - If even one member is invalid, group creation is rejected.
 */
export async function createGroup(req, res, next) {
  try {
    const { name, description, members = [] } = req.body;
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required to create a group' });
    }

    if (!req.user.isVerified) {
      return res.status(403).json({ error: 'You must verify your email before creating groups' });
    }

    // Owner is member #1
    const ownerMember = {
      name: req.user.name,
      email: req.user.email.toLowerCase(),
      userId: req.user._id
    };

    const validatedMembers = [ownerMember];
    const seenUserIds = new Set([String(req.user._id)]);
    const seenEmails = new Set([req.user.email.toLowerCase()]);

    // Validate ALL additional members
    for (const rawMember of members) {
      const candidate = await validateVerifiedUser(rawMember);

      // Duplicate member detection
      if (seenUserIds.has(String(candidate.userId)) || seenEmails.has(candidate.email)) {
        return res.status(400).json({
          error: `User "${candidate.name}" (${candidate.email}) is already added to this group`
        });
      }

      seenUserIds.add(String(candidate.userId));
      seenEmails.add(candidate.email);
      validatedMembers.push(candidate);
    }

    const group = await Group.create({
      name: name.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      ownerId: req.user._id,
      members: validatedMembers
    });

    res.status(201).json(group);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

export async function deleteGroup(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Only the group owner can delete it
    if (group.ownerId) {
      const requesterId = req.user?._id || req.userId;
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

/**
 * Adds a new member to an existing group.
 * Strictly verifies user exists, is verified, and is not already in the group.
 */
export async function addMember(req, res, next) {
  try {
    const { userId, email } = req.body;
    const identifier = userId || email || req.body.member;

    if (!identifier) {
      return res.status(400).json({ error: 'User selection (userId or email) is required' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Validate that the user exists and is verified
    const validatedUser = await validateVerifiedUser(identifier);

    // Prevent duplicate members in group
    const isAlreadyMember = group.members.some(
      (m) => (m.userId && String(m.userId) === String(validatedUser.userId)) ||
             (m.email && m.email.toLowerCase() === validatedUser.email.toLowerCase())
    );

    if (isAlreadyMember) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    group.members.push({
      userId: validatedUser.userId,
      name: validatedUser.name,
      email: validatedUser.email
    });

    await group.save();

    await createAndBroadcastNotification({
      groupId: group._id,
      type: 'member_added',
      actorId: req.user?._id || null,
      actorName: req.user?.name || 'System',
      message: `${validatedUser.name} joined the group`
    });

    await recordAuditLog({
      action: 'member_added',
      actorId: req.user?._id || null,
      actorName: req.user?.name || 'System',
      groupId: group._id,
      payload: { memberName: validatedUser.name, memberEmail: validatedUser.email }
    });

    res.status(201).json(group);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * Join group via invite link.
 * Authenticated verified user joins the group.
 */
export async function joinGroup(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Please log in to join this group' });
    }

    if (!req.user.isVerified) {
      return res.status(403).json({ error: 'You must verify your email before joining groups' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isAlreadyMember = group.members.some(
      (m) => String(m.userId) === String(req.user._id) || m.email.toLowerCase() === req.user.email.toLowerCase()
    );

    if (isAlreadyMember) {
      return res.status(400).json({ error: 'You are already a member of this group', group });
    }

    group.members.push({
      userId: req.user._id,
      name: req.user.name,
      email: req.user.email.toLowerCase()
    });

    await group.save();
    res.status(200).json({ message: 'Joined group successfully', group });
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
      email: m.email,
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
