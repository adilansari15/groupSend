import Group from '../models/Group.js';
import Expense from '../models/Expense.js';

export async function getReports(req, res, next) {
  try {
    const { id } = req.params;
    const { period = 'monthly' } = req.query;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const expenses = await Expense.find({ groupId: id }).sort('-date -createdAt').lean();
    const memberMap = Object.fromEntries(group.members.map((m) => [String(m._id), m.name]));

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = startOfToday - 29 * 24 * 60 * 60 * 1000;

    let totalSpend = 0;
    let todaySpend = 0;
    let weekSpend = 0;
    let monthSpend = 0;

    const catMap = {};
    const periodMap = {};

    const populatedExpenses = expenses.map((e) => {
      const expDate = new Date(e.date);
      const time = expDate.getTime();
      const amt = e.amount;

      totalSpend += amt;
      if (time >= startOfToday) todaySpend += amt;
      if (time >= sevenDaysAgo) weekSpend += amt;
      if (time >= thirtyDaysAgo) monthSpend += amt;

      const cat = e.category || 'Other';
      if (!catMap[cat]) catMap[cat] = { category: cat, total: 0, count: 0 };
      catMap[cat].total += amt;
      catMap[cat].count += 1;

      // Grouping based on query period
      let periodKey = '';
      if (period === 'daily') {
        periodKey = expDate.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const d = new Date(Date.UTC(expDate.getFullYear(), expDate.getMonth(), expDate.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        periodKey = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
      } else {
        // monthly
        periodKey = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!periodMap[periodKey]) {
        periodMap[periodKey] = { period: periodKey, total: 0, count: 0 };
      }
      periodMap[periodKey].total += amt;
      periodMap[periodKey].count += 1;

      return {
        ...e,
        payerNames: e.payments.map((p) => memberMap[String(p.memberId)] || 'Unknown').join(', ')
      };
    });

    const categoryBreakdown = Object.values(catMap).sort((a, b) => b.total - a.total);
    const periodBreakdown = Object.values(periodMap).sort((a, b) => a.period.localeCompare(b.period));

    res.json({
      period,
      totalSpend,
      todaySpend,
      weekSpend,
      monthSpend,
      categoryBreakdown,
      periodBreakdown,
      expenses: populatedExpenses
    });
  } catch (err) {
    next(err);
  }
}
