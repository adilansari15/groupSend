import User from '../models/User.js';

/**
 * Searches for registered and verified users by name or email.
 * Only returns active, verified users with public profile attributes.
 */
export async function searchUsers(req, res, next) {
  try {
    const q = req.query.q;
    if (typeof q !== 'string' || !q.trim() || q.trim().length < 2) {
      return res.json([]);
    }

    // Sanitize query to prevent ReDoS / Regex injection
    const sanitizedQuery = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(sanitizedQuery, 'i');

    const users = await User.find({
      isVerified: true,
      $or: [
        { name: regex },
        { email: regex }
      ]
    })
      .select('_id name email isVerified')
      .limit(10)
      .lean();

    const results = users.map((u) => ({
      id: String(u._id),
      _id: String(u._id),
      name: u.name,
      email: u.email
    }));

    res.json(results);
  } catch (err) {
    next(err);
  }
}
