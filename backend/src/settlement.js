// Pure functions. Amounts are integer paise; ids are strings.

export function splitEqual(total, memberIds) {
  const base = Math.floor(total / memberIds.length);
  let rem = total - base * memberIds.length;
  return memberIds.map((memberId) => ({ memberId, amount: base + (rem-- > 0 ? 1 : 0) }));
}

export function balances(memberIds, expenses, settlements = []) {
  const b = Object.fromEntries(memberIds.map((id) => [id, 0]));
  for (const e of expenses) {
    for (const p of e.payments) b[p.memberId] += p.amount;
    for (const s of e.shares) b[s.memberId] -= s.amount;
  }
  for (const s of settlements) { b[s.from] += s.amount; b[s.to] -= s.amount; }
  return b;
}

export function transfers(bal) {
  const debtors = [], creditors = [];
  for (const [id, v] of Object.entries(bal)) {
    if (v < 0) debtors.push([id, -v]);
    else if (v > 0) creditors.push([id, v]);
  }
  debtors.sort((a, b) => b[1] - a[1]);
  creditors.sort((a, b) => b[1] - a[1]);
  const out = []; let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i][1], creditors[j][1]);
    out.push({ from: debtors[i][0], to: creditors[j][0], amount });
    debtors[i][1] -= amount; creditors[j][1] -= amount;
    if (!debtors[i][1]) i++;
    if (!creditors[j][1]) j++;
  }
  return out;
}

export function validateExpense(total, payments, shares) {
  if (!Number.isInteger(total) || total <= 0 || total > 10000000000) {
    throw new Error('Total amount must be a positive integer in paise (max ₹10,00,00,000)');
  }
  if (!Array.isArray(payments) || payments.length === 0) {
    throw new Error('At least one payment is required');
  }
  if (!Array.isArray(shares) || shares.length === 0) {
    throw new Error('At least one share is required');
  }
  const sumPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  if (sumPayments !== total) {
    throw new Error(`Payments sum (${sumPayments}) does not match total amount (${total})`);
  }
  const sumShares = shares.reduce((sum, s) => sum + (s.amount || 0), 0);
  if (sumShares !== total) {
    throw new Error(`Shares sum (${sumShares}) does not match total amount (${total})`);
  }
  return true;
}
