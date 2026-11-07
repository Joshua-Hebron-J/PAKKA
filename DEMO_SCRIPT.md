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

## Premium UI walkthrough

1. Sign in as Rohan. Home shows real totals and the selected **Promise tracker demo · fictional** agreement. Verify ₹5,000 original, ₹500 confirmed repaid and ₹4,500 outstanding; the reference image's ₹25,000/Arjun story was not imported.
2. Choose an agreement in the picker. Use **View agreement & ledger** to inspect accepted terms, exact rates, the shared ledger and bilateral amendment controls.
3. Open **Promise Tracker** (mobile: **Tracker**). Inspect fulfilled and pending intentions and expand repayment evidence. Record a promise is expandable and borrower-only; the redesign demo can inspect it without submitting anything.
4. In Home or **AI Insights**, enter explicit affordability and an availability date, then Compare insights. Memory ON performs real Hindsight recall/reflect; Show evidence maps short numbered citations to actual memory IDs. Toggle OFF and compare again: no remembered-history claims or AI evidence remain.
5. Open **Timeline**. Filter All, Ledger events, Intentions and AI memories. Recall supporting memories is explicit; retrieved interpretations stay distinct from ledger events. All dates/amounts are sourced from actual app records.
6. Open **Reminders** from the sidebar or mobile header bell. Copy Reminder remains available within the selected agreement; it copies only and sends nothing externally.
7. Use the account avatar to sign out and choose Asha. The same shared data is visible; borrower-only promise/affordability controls are absent. No false demo email or income is displayed.

The mobile bottom bar links Home, Agreements, Tracker, Timeline and Insights. Navigation opens views at the top. New agreement opens the existing form; canceling leaves the ledger untouched. No commit, push or deployment is part of this UI review.

## Personal finance + Money Coach demo (3–4 minutes)

1. Open http://127.0.0.1:3000 and choose **Rohan**. Open **Money Manager** (Money on mobile). The prepared sample is explicitly fictional. For November 2026 it shows income **₹65,000**, expenses **₹26,900**, net **₹38,100**, savings rate **58.62%**. The historical sample dates use the current reporting month when initially loaded; selecting another month recalculates the view.
2. Show the category breakdown and filter entries by Food. Edit the fictional Food entry from ₹4,500.00 to ₹4,500.01, confirm it and save locally: expenses become ₹26,900.01, net ₹38,099.99. Restore ₹4,500.00 afterward. This does not contact AI. Add real entries only when genuinely confirmed; use another isolated fixture ledger for destructive CRUD rehearsals.
3. Open **Budgets** (mobile More → Budgets). Food spent is ₹4,500 of a fictional ₹6,000 limit; Housing is ₹18,000 of ₹20,000. Edit a limit, or demonstrate that zero is supported. Spending is computed from entries; budget limits are plans, not payments.
4. Open **Savings Goals**. The fictional emergency cushion has ₹5,000 allocated toward ₹60,000. Expand contribution history. Explain that a contribution is bookkeeping, never a second expense or transfer. The monthly expense total remains ₹26,900.
5. Open **AI Coach** with Memory OFF, then **Show Memory OFF result**. The ledger-only conditional cap is ₹6,500: the smaller of 10% of recorded income and recorded positive surplus after this month's allocations. It does not prove essential future costs are covered or imply an actual bank balance.
6. Switch Memory ON. The sync button stays disabled until explicit consent. Explain that current personal entries/notes, budgets, goals and allocations will be sent to Hindsight. With only authorized fictional records, check consent and choose **Sync confirmed records & ask coach**. Show the live status, historical observation, deterministic calculation, and expandable numbered evidence. If offline, say offline; do not narrate an invented successful recall.
7. **Compare ledger-only** makes zero provider calls. Switching memory itself does not sync. After editing/deleting personal records, the previous provider snapshot remains until another explicit sync replaces it; the revision indicator shows pending changes.
8. Switch to **Asha** and open Money Manager. Her personal ledger is empty; Rohan's transactions and coach results are not shown. Do not load Asha's sample unless you want a separate explicitly fictional demonstration. Return to Rohan for the prepared finance sample.
9. Open Agreements/Home: the original ₹4,500 fictional shared agreement balance, promises, bilateral approvals, timeline and copy-only reminders still work. Shared confirmed repayments never import into personal expenses automatically. There are no transfers, investments or bank integrations.

Keep `.env.local`, local databases and private bank names out of recordings. These publicly switchable demo accounts demonstrate session-based isolation, not production identity security.

## Borrower amount update walkthrough

Use a disposable fictional agreement or `node scripts/verify-amount-updates.mjs --serve` after a build, keeping the normal demo data unchanged.

1. Sign in as Rohan (borrower), open an accepted agreement and expand **Request amount update**. The isolated browser fixture starts with ₹1,000 principal and a confirmed ₹250 repayment, leaving ₹750.
2. Request **₹800.01** with a reason. The request shows **Pending**, original/proposed principal and reason. Active principal stays ₹1,000; remaining balance stays ₹750. The borrower has no approve/reject controls.
3. Switch to Asha (lender). Home/Agreements shows the pending request. Open it and approve. The request becomes **Approved**; principal is ₹800.01 and remaining balance ₹550.01. The original ₹250 confirmed repayment remains intact; no money moved.
4. Switch back to Rohan; request ₹900 with a new reason. Asha rejects it. **Rejected** and the earlier **Approved** request remain in history; principal/balance stay ₹800.01/₹550.01.
5. Show the audit timeline and the existing agreement insights action: the approved change is eligible for Hindsight sync, while pending/rejected proposals are not agreed financial facts. Memory OFF still makes no provider calls.
6. Explain server guards: the lender cannot initiate this borrower-only request; the borrower cannot self-approve; duplicate/stale decisions fail; pending payments must be resolved before proposal/approval; amounts cannot fall below confirmed repayments. General amendments retain bilateral approval and the same repayment floor. Money Manager records remain separate.

## Final cinematic opening and submission

1. Refresh the app once at http://127.0.0.1:3000. Show the lavender lighting and illustrated hands approaching, clasping with coordinated motion, then transitioning into the exact PAKKA logo, wordmark and tagline. The decorative sequence takes 2.7 seconds; the app loads independently underneath.
2. Navigate Home → Money Manager → Agreements. The intro does not replay. Input immediately dismisses it; no fake progress indicator is shown. Existing loading/error states remain truthful if data is slower.
3. For reduced motion, the hand/camera/particle animations are replaced by a brief static genuine logo. Do not change the user's OS preference during a recording. CSS independently hides the overlay, the JS deadline is 2.85 seconds, and a logo failure dismisses it immediately.
4. Use the existing borrower/lender and finance walkthroughs above. The prepared Rohan sample still shows ₹65,000 income, ₹26,900 expenses and ₹38,100 net for November 2026. Existing shared principal/payment data was not changed for intro QA.
5. Submission checks: 96 tests (all original 87 plus 9 intro lifecycle/fallback checks), lint, typecheck, production build and full-index credential/artifact scan. Keep the local demo running. The repository is public: obtain explicit approval before commit/push, then verify remote `main` SHA equals the new local commit SHA. Do not deploy.

Visual references: [Current reference V4](docs/pakka-handshake-v4-desktop.png), [Current reference V4](docs/pakka-handshake-v4-logo.png), [Current reference V4](docs/pakka-handshake-v4-mobile.png).

## Approved-reference replacement and typography

1. Refresh the app once. The new compact vector hands approach and clasp, then dissolve into the exact purple P logo, **Sora ExtraBold** PAKKA wordmark, tagline and four labels: Track Agreements, Manage Your Money, Grow Your Savings, AI Money Coach. The old oversized sleeves are gone. The decorative intro lasts 2.7 seconds and does not delay app requests or show fake progress.
2. Navigate Home → Money Manager → Agreements. The intro stays dismissed. Point out **Plus Jakarta Sans** headings, body, inputs and tabular INR amounts, improved spacing and the unbroken month label on narrow screens.
3. Both fonts are served by the application, with swap/metric-adjusted fallbacks; no browser request to Google is needed. Reduced motion shows only the static genuine logo/lockup briefly. Input or image failure dismisses the intro immediately.
4. Continue the unchanged borrower/lender, promises, memory/evidence and finance walkthroughs above. Rohan's November sample remains ₹65,000 income, ₹26,900 expenses, ₹38,100 net and 58.62% savings rate. No financial records were edited for this visual check.
5. Verified: 96 tests, lint, typecheck, production build; desktop/mobile fonts and layout; no horizontal overflow at 320/390/1440px; both local font assets HTTP 200; financial ledger hashes and custom logo unchanged. The demo server remains running. Do not push or deploy this update.

## New reference V4 handshake and Replay Intro

1. Keep `npm run dev` running and choose **Replay Intro** at the bottom right. This restarts only the intro without signing out, resetting the active page, changing inputs, making a payment or sending data to Hindsight.
2. The new illustration follows the supplied Professional Handshake reference: the dark thumb crosses the light hand, curved fingers interlock below it, and tailored purple/white sleeves have restrained proportions. Subtle orbital light surrounds the clasp before it transitions to the exact existing P logo, PAKKA, tagline and feature labels.
3. The live SVG identity is `pakka-handshake-reference-v4`. Do not use previous loading screenshots: they are archived locally; all current links point to V4 captures.
4. Check desktop/mobile screenshots and the static reduced-motion fallback. The presentation is 2.7 seconds, with no fake progress or data gate. The Replay Intro control is intentionally absent from `npm run build` / `npm start` output.
5. Verification: **100 tests**, lint, typecheck and production build; **0 reused paths** against **94 retired fingerprints**; development replay loads V4; fresh production renders V4 with no Replay Intro button. Both financial ledger hashes remain unchanged. Do not commit, push or deploy.
