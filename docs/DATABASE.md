# Database (MongoDB)
- **groups**: name, description, members[{_id, name}]
- **expenses**: groupId, title, amount, category, date, notes, payments[{memberId, amount}], shares[{memberId, amount}]
- **settlements**: groupId, from, to, amount, date
- **users** (phase 3): name, email, passwordHash

Rules: amounts are integer paise; sum(payments) = sum(shares) = amount; index expenses and settlements by groupId.
