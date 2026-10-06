// Pure functions identical to backend/src/settlement.js

export function splitEqual(total, memberIds) {
  if (!memberIds.length) return [];
  const base = Math.floor(total / memberIds.length);
  let rem = total - base * memberIds.length;
  return memberIds.map((memberId) => ({ memberId, amount: base + (rem-- > 0 ? 1 : 0) }));
}

export function balances(memberIds, expenses, settlements = []) {
  const b = Object.fromEntries(memberIds.map((id) => [id, 0]));
  for (const e of expenses) {
    for (const p of e.payments || []) b[p.memberId] = (b[p.memberId] || 0) + p.amount;
    for (const s of e.shares || []) b[s.memberId] = (b[s.memberId] || 0) - s.amount;
  }
  for (const s of settlements || []) {
    b[s.from] = (b[s.from] || 0) + s.amount;
    b[s.to] = (b[s.to] || 0) - s.amount;
  }
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
