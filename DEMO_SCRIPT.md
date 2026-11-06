# 2–5 minute walkthrough

1. Start `npm run dev`, open localhost:3000. Sign in as Asha. Explain lent/owed balances, final due-date reminders and the shared ledger.
2. New agreement: "Laptop bridge", ₹10,000, 0% annual simple interest, today to a future due date, 2 equal installments, "Two equal repayments; no late fees." Send for approval. It does not enter totals yet.
3. Sign out; choose Rohan. Open the pending agreement, inspect the terms and accept. Balance is ₹10,000.
4. Rohan reports ₹2,500. Balance remains ₹10,000 while pending.
5. Switch to Asha. Confirm the payment. Balance becomes ₹7,500 on both accounts. Show immutable verified history.
6. Optionally report ₹100 and dispute it from the other account. Confirm that the balance stays ₹7,500. Propose amended due date; the original terms stay active until counterparty approval.
7. Open Memory. If credentials are configured, select the agreement, Memory on → Compare insights. Wait for real retain/recall/reflect, show source IDs, then Memory off → Compare insights. This baseline has only present state and makes no API call. Never narrate a live memory demonstration while Not connected.
8. Show overdue travel seed agreement, Refresh reminders. Explain final-due in-app reminders only. End: records support clarity, but do not guarantee legal enforceability or prevent all fraud.

Before recording: configure Hindsight, verify evidence appears, rehearse both sessions, use 1080p capture. Do not show `.env.local`, credentials, or private banks.

## New features: quick demo (2–3 minutes)

1. Open http://127.0.0.1:3000. Sign in as **Rohan** and open **Promise tracker demo · fictional**. Its confirmed remaining balance is ₹4,500. No real transfers took place.
2. Show the fulfilled ₹500 promise and expand its confirmed-payment evidence. A later ₹100.50 browser-demo promise is pending; the earlier repayment does not retroactively fulfill it.
3. To create another promise, enter an affordable amount and a date today or later, optionally a note, then **Record promise**. It changes neither balance nor agreed terms. Switch to Asha: the same promise is visible, and lender-side promise creation is unavailable.
4. As Rohan, enter **I can afford: 1000** and choose a future **Available on** date. **Compare insights** with Memory ON: show concise history from real Hindsight, source IDs, and the ₹1,000 advisory. Affordability is explicitly self-reported. It is not inferred income, and no payment or amendment is submitted.
5. Toggle Memory OFF and compare again. Current exact balance/date and a local advisory remain, while remembered history and AI evidence disappear. With an unavailable provider, the ledger stays usable and the interface says offline.
6. Choose **Copy Reminder**. Show copied-state feedback and the generated text with ₹4,500 and the agreed due date. Nothing is sent externally. Clipboard fallback allows manual copying if the browser blocks access.
7. In **AI memory timeline**, show acceptance → borrower intention → reported payment → confirmed payment → promise fulfilled. Verified ledger events and borrower intentions have distinct labels. AI source references link to events; synthesized memories are separately expandable, not extra ledger events.

For a fresh pending-to-fulfilled demonstration: Rohan records a small promise, then reports a new repayment after it. It stays pending until Asha confirms. A dispute or unconfirmed report does not fulfill it. Any due-date/term change still uses the existing bilateral amendment flow.
