import test from 'node:test';
import assert from 'node:assert/strict';
import { balances, transfers, splitEqual, validateExpense } from './settlement.js';

// Scenario 1: 4 members, ₹1,000 equal split. Paid: Aditya 300, Arunkumar 400, Ayush 300, Rohan 0
test('Scenario 1: 4 members, ₹1,000 equal split (screenshot case)', () => {
  const ids = ['aditya', 'arun', 'rohan', 'ayush'];
  const pay = { aditya: 300, arun: 400, rohan: 0, ayush: 300 };
  const e = { payments: ids.map((id) => ({ memberId: id, amount: pay[id] * 100 })), shares: splitEqual(100000, ids) };
  const t = transfers(balances(ids, [e]));
  assert.deepEqual(t.map((x) => [x.from, x.to, x.amount / 100]), [
    ['rohan', 'arun', 150],
    ['rohan', 'aditya', 50],
    ['rohan', 'ayush', 50]
  ]);
});

// Scenario 2: One payer, everyone else owes equal share
test('Scenario 2: One payer, everyone else owes equal share', () => {
  const ids = ['alice', 'bob', 'charlie'];
  const total = 30000; // ₹300
  const e = {
    payments: [{ memberId: 'alice', amount: total }],
    shares: splitEqual(total, ids)
  };
  const t = transfers(balances(ids, [e]));
  // Both bob and charlie owe alice ₹100 (10000 paise)
  assert.equal(t.length, 2);
  assert.ok(t.find((x) => x.from === 'bob' && x.to === 'alice' && x.amount === 10000));
  assert.ok(t.find((x) => x.from === 'charlie' && x.to === 'alice' && x.amount === 10000));
});

// Scenario 3: Everyone paid exactly their share
test('Scenario 3: Everyone paid exactly their share', () => {
  const ids = ['alice', 'bob', 'charlie'];
  const e = {
    payments: ids.map((id) => ({ memberId: id, amount: 10000 })),
    shares: ids.map((id) => ({ memberId: id, amount: 10000 }))
  };
  const t = transfers(balances(ids, [e]));
  assert.equal(t.length, 0);
});

// Scenario 4: ₹100 split among 3
test('Scenario 4: ₹100 split among 3 (shares 33.34 / 33.33 / 33.33)', () => {
  const ids = ['a', 'b', 'c'];
  const s = splitEqual(10000, ids); // 10000 paise = ₹100
  assert.equal(s.reduce((x, y) => x + y.amount, 0), 10000);
  assert.equal(s[0].amount, 3334);
  assert.equal(s[1].amount, 3333);
  assert.equal(s[2].amount, 3333);
});

// Scenario 5: Custom split where shares sum to the total
test('Scenario 5: Custom split where shares sum to the total', () => {
  const ids = ['alice', 'bob'];
  const payments = [{ memberId: 'alice', amount: 5000 }];
  const shares = [{ memberId: 'alice', amount: 2000 }, { memberId: 'bob', amount: 3000 }];
  assert.ok(validateExpense(5000, payments, shares));
  const b = balances(ids, [{ payments, shares }]);
  assert.equal(b.alice, 3000);
  assert.equal(b.bob, -3000);
});

// Scenario 6: Custom split where shares do not sum to the total
test('Scenario 6: Custom split where shares do not sum to total is rejected', () => {
  const payments = [{ memberId: 'alice', amount: 5000 }];
  const invalidShares = [{ memberId: 'alice', amount: 2000 }, { memberId: 'bob', amount: 2500 }]; // 4500 !== 5000
  assert.throws(() => validateExpense(5000, payments, invalidShares), /Shares sum/);
});

// Scenario 7: Partial settlement recorded
test('Scenario 7: Partial settlement recorded reduces transfer amount', () => {
  const ids = ['alice', 'bob'];
  const e = {
    payments: [{ memberId: 'alice', amount: 10000 }],
    shares: splitEqual(10000, ids)
  }; // bob owes alice 5000 paise (₹50)
  const initialTransfers = transfers(balances(ids, [e]));
  assert.equal(initialTransfers[0].amount, 5000);

  // Bob pays Alice 2000 paise (₹20) partially
  const settlements = [{ from: 'bob', to: 'alice', amount: 2000 }];
  const remainingTransfers = transfers(balances(ids, [e], settlements));
  assert.equal(remainingTransfers.length, 1);
  assert.equal(remainingTransfers[0].amount, 3000);
});

// Scenario 8: Full settlement recorded
test('Scenario 8: Full settlement recorded leaves 0 pending settlements', () => {
  const ids = ['alice', 'bob'];
  const e = {
    payments: [{ memberId: 'alice', amount: 10000 }],
    shares: splitEqual(10000, ids)
  }; // bob owes alice 5000
  const settlements = [{ from: 'bob', to: 'alice', amount: 5000 }];
  const remainingTransfers = transfers(balances(ids, [e], settlements));
  assert.equal(remainingTransfers.length, 0);
});

// Scenario 9: Sum of all net balances
test('Scenario 9: Sum of all net balances is always 0', () => {
  const ids = ['a', 'b', 'c', 'd'];
  const expenses = [
    {
      payments: [{ memberId: 'a', amount: 12000 }, { memberId: 'b', amount: 3000 }],
      shares: splitEqual(15000, ids)
    },
    {
      payments: [{ memberId: 'c', amount: 5000 }],
      shares: [{ memberId: 'a', amount: 1000 }, { memberId: 'c', amount: 2000 }, { memberId: 'd', amount: 2000 }]
    }
  ];
  const settlements = [{ from: 'd', to: 'a', amount: 1500 }];
  const b = balances(ids, expenses, settlements);
  const sum = Object.values(b).reduce((acc, v) => acc + v, 0);
  assert.equal(sum, 0);
});

// Scenario 10: Number of transfers is at most (members - 1)
test('Scenario 10: Number of transfers is at most (members - 1)', () => {
  const ids = ['m1', 'm2', 'm3', 'm4', 'm5'];
  const expenses = [
    { payments: [{ memberId: 'm1', amount: 25000 }], shares: splitEqual(25000, ids) },
    { payments: [{ memberId: 'm3', amount: 15000 }], shares: splitEqual(15000, ids) }
  ];
  const b = balances(ids, expenses);
  const t = transfers(b);
  assert.ok(t.length <= ids.length - 1);
});
