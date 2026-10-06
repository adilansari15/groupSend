import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-jwt-secret' : null);
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production.');
    }
    return 'dev-fallback-secret-key-32chars-min!!';
  }
  return secret;
}

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

import Group from '../models/Group.js';

export async function optionalAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, getJwtSecret());
      req.userId = decoded.id;
      const user = await User.findById(decoded.id).select('-passwordHash');
      if (user) {
        req.user = user;
      }
    }
  } catch (_ignored) {
    // optional, proceed unauthenticated
  }
  next();
}

/**
 * Middleware ensuring caller is an authenticated, active member or owner of the target group.
 * Strictly blocks unauthorized eavesdropping from guests or non-members.
 */
export async function requireGroupMember(req, res, next) {
  try {
    const groupId = req.params.groupId || req.params.id;
    if (!groupId) return res.status(400).json({ error: 'Group ID is required' });

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Only group members can access group details.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (_err) {
      return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists' });
    }
    req.user = user;
    req.userId = user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verify membership or group ownership
    const isOwner = group.ownerId && String(group.ownerId) === String(user._id);
    const isMember = group.members.some(
      (m) => (m.userId && String(m.userId) === String(user._id)) ||
             (m.email && m.email.toLowerCase() === user.email.toLowerCase())
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
    }

    req.group = group;
    next();
  } catch (err) {
    next(err);
  }
}

export function signToken(user) {
  return jwt.sign({ id: user._id, email: user.email }, getJwtSecret(), { expiresIn: '7d' });
}
