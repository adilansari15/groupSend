# GroupSpend Web: Context

Background document for anyone (or any AI assistant) picking up this project.

## Who and why
- Owner: Mohammad Adil Ansari, B.Tech CSE student (AKTU, Lucknow), MERN stack developer
- GroupSpend started as an Android app, shared on LinkedIn, offline-only
- Goal now: a website version as a portfolio project, built on the MERN stack

## Source app (from screenshots)
GroupSpend (Android) screens:
- **Home:** group switcher, Group Balance Status (total spend, pending settlements), Total Expenses (today/week/month), Who Pays Whom, Recent Expenses, Add Expense button
- **Create New Group:** name (required), description, add members as chips
- **Add New Expense:** members with checkboxes, Equal Split / Custom Split, split calculation, live "Who will pay to whom" preview, notes
- **Expense Recorded:** settlement breakdown with Settle Now buttons and a contribution breakdown (paid vs share per member)
- **Reports:** Daily / Weekly / Monthly tabs, category donut, day's expenses
- Bottom navigation: Home, Expenses, Reports, Members, Settlements
- Currency: INR (₹). Palette: teal primary (#1f8a7a), soft mint cards, purple accent for the preview panel.
- Sample data in screenshots: groups "College Group", "Tourist Group", "Hostel Group"; members Aditya Pandey, Arunkumar Chaudhary, Rohan Verma, Ayush Singh

## Current artifact
`groupspend.html`: vanilla JS single file, state in localStorage under the key `groupspend`.

State shape:
```
{ groups:[{ id, name, desc,
    members:[{id,name}],
    expenses:[{id,title,amount,cat,date,payer,shares:{memberId:amount},notes}],
    settled:[{from,to,amt,date}] }],
  cur: groupId }
```

## Decisions made
- Members are plain names inside a group (matches the app); user accounts come later
- One payer per expense in the prototype; multi-payer planned
- Categories: Food, Travel, Rent, Shopping, Bills, Other
- Settlement uses a greedy largest-debtor-to-largest-creditor match (simple, near-minimal)
- Money should be integer paise in the real backend

## Conventions
- Sentence-case UI copy; buttons name the action ("Settle now", "Add expense")
- Keep settlement logic as pure functions with unit tests
- Docs live in `docs/`: project.md (overview), projectPlan.md (roadmap), projectStatus.md (current state), projectTest.md (tests), projectContext.md (this file)
