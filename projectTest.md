# GroupSpend Web: Test Plan

## 1. Settlement algorithm (unit tests)
Money in paise in code; rupees shown here.

| # | Scenario | Expected |
|---|---|---|
| 1 | 4 members, ₹1,000 equal split. Paid: Aditya 300, Arunkumar 400, Ayush 300, Rohan 0 | Rohan pays Arunkumar 150, Aditya 50, Ayush 50 (taken from the Android app screenshots) |
| 2 | One payer, everyone else owes equal share | Each other member pays the payer once |
| 3 | Everyone paid exactly their share | No transfers |
| 4 | ₹100 split among 3 | Shares 33.34 / 33.33 / 33.33, sum is exactly 100.00 |
| 5 | Custom split where shares sum to the total | Balances match the custom shares |
| 6 | Custom split where shares do not sum to the total | Rejected with an error |
| 7 | Partial settlement recorded | Remaining transfer reduces by that amount |
| 8 | Full settlement recorded | Pending settlements are 0 |
| 9 | Sum of all net balances | Always 0 |
| 10 | Number of transfers | At most (members - 1) |

## 2. Manual UI checks
- [ ] Create group with name only, then with description and several members
- [ ] Group name is required; blank name shows an error
- [ ] Add expense with fewer than 2 members shows a clear message
- [ ] Equal split preview updates when members are unticked
- [ ] Custom split total mismatch blocks Save
- [ ] Saved expense shows the breakdown dialog and updates Home, Reports, Settlements
- [ ] Delete expense recalculates balances
- [ ] Settle now updates pending settlements and history
- [ ] Switch groups: data does not leak between groups
- [ ] Delete group asks for confirmation
- [ ] Reload page: data persists
- [ ] Names with `<script>` or quotes render as text

## 3. Layout and accessibility
- [ ] 360 px phone width: no horizontal scroll, bottom nav visible, labels do not wrap ("Settlements")
- [ ] Long member names (e.g. "Arunkumar Chaudhary") do not overlap amounts
- [ ] Large amounts (₹1,00,000.00) fit in cards and the list
- [ ] Dark mode readable
- [ ] Keyboard: tab through modal, Escape or Cancel closes it

## 4. Issues to verify (seen in the Android app screenshots)
- The live preview in Add Expense listed Ayush ₹150 / Arunkumar ₹50, but the saved result listed Arunkumar ₹150 / Ayush ₹50. Confirm the preview and the saved result use the same logic.
- Reports row said "Paid by Arunkumar Chaudhary" while Home said "Paid by Aditya Pandey + 2 others". Confirm one consistent payer display for multi-payer expenses.
- The amount text wrapped in the Reports row (₹1,00 / 0.00). Use a non-wrapping amount column.

## 5. API tests (after backend)
- Auth required on every group route; a non-member gets 403
- Validation: negative or zero amount, unknown member, shares not summing to the amount
- Jest or Vitest for services, Supertest for routes, a Mongo memory server for integration
