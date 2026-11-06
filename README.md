# PAKKA

Every Rupee. Every Promise. Remembered.

A local two-person fintech MVP: real server sessions, bilateral agreements, exact INR accounting, counterparty-confirmed repayments, amendments, in-app reminders and a real Hindsight REST adapter.

## Quick start

Requires Node **24.16+** (native `node:sqlite`), npm and a writable `data` directory.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. Choose Asha or Rohan. Sign out to switch accounts. Seed agreements are generated on first use; their dates are relative to first launch. Data persists in `data/pakka.sqlite`. Demo users are intentionally public selectable accounts, not production identity verification. Do not expose this demo to the public internet.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

## Accounting and state rules

Amounts are integer paise; input accepts at most two decimal places. Annual simple rate is basis points (100 bps = 1% p.a.). Interest uses actual UTC calendar days / 365, rounded half up to one paise, computed once through final due date. There is no compounding, late fee or reducing-balance interest. Equal installment amounts allocate leftover paise to early installments and conserve the exact total; due dates divide the start-to-final-due interval evenly. This is an equal-payment schedule rather than an amortizing EMI product. Reminders apply to the final agreement due date, not individual installments.

Only accepted agreements enter dashboard totals. A reported payment reserves capacity but does not change the shared confirmed balance. Counterparty confirmation is final; a dispute has no balance impact and a corrected payment can be reported separately. Terms remain unchanged until the other party approves an amendment. Confirmed payments and past events have no edit/delete endpoint.

SQLite stores a single transactional JSON aggregate plus a sessions table. Synchronous read/transition/write operations run without awaits, avoiding lost updates in one Node process. This local demo is designed for **one server process**, not distributed or multi-worker deployment. Native SQLite replaces the suggested Prisma stack to keep Node 24 setup lean. Styling uses custom responsive CSS instead of Tailwind.

## Hindsight setup

1. Obtain your own API key in [Hindsight Cloud](https://ui.hindsight.vectorize.io/) or use your configured compatible server. Service use may have charges; PAKKA does not create an account or purchase credits.
2. Put `HINDSIGHT_API_KEY` in `.env.local`; keep it server-only. Set `HINDSIGHT_API_URL` if needed.
3. Set `HINDSIGHT_BANK_PREFIX` to a unique private installation namespace (e.g. `pakka-joshua-20261105-<random>`). Keep it stable after first sync.
4. Restart Next.js, open an accepted agreement, turn Memory on, choose **Compare insights**. This explicitly sends verified events to the service and performs real retain, recall and reflect requests. Compare with Memory off, which makes no provider request.
5. Inspect evidence IDs in the returned result. If credentials/network fail, the app displays the error and does not substitute fabricated output. Without a key it displays **Not connected**. Configured does not mean connectivity has been verified.

Memory sync is an explicit operation when requesting insights, not an unimplemented background task. Unsynced verified events form a durable outbox. Stable event document IDs allow retry/replacement after failure. Each agreement has its own bank, derived from its UUID plus the installation namespace. Every insight request checks the current session and agreement membership before selecting a bank. Credentials and bank selection never come from the browser. Current date/ledger calculations remain authoritative; AI suggestions cannot modify them. Demo seed events are clearly fictional sample records, not real-world payment evidence. See HINDSIGHT_PROOF.md for actual verification status.

## Reminders

Dashboard reminders are deterministically recalculated on read. Use **Refresh reminders** to persist the latest status. An authenticated party may POST `/api/reminders` to refresh only their agreements. For a scheduler, configure `CRON_SECRET` server-side and POST with `Authorization: Bearer <secret>`; this refreshes all agreements. No external scheduler, email, SMS, push or background delivery is included.

## Security and limits

Opaque 256-bit session tokens, HttpOnly/SameSite cookies, 24-hour server-side expiry, membership checks on queries and mutations, same-origin mutation checks, Zod validation, and state-transition guards. Do not mistake demo sign-in for secure production user enrollment. Keep HTTPS for any hosted use; cookies are Secure on HTTPS in production. Real production needs identity verification, rate limits, backups, audit retention and a normalized/multi-process transaction model. No bank transfer/payment gateway, notifications, legal guarantees or fraud-prevention guarantee. Notes are plain text; provider output is rendered as plain text. No secrets or runtime SQLite data should be committed.

## Focused agreement tools (November 6, 2026)

- **Smart repayment suggestions:** the borrower may optionally enter an exact amount they can afford and its availability date. INR suggestions are capped at that amount and the remaining balance less pending payment reservations. Memory ON adds real Hindsight repayment context; OFF uses the current ledger only. No income or history is invented. Affordability is request-scoped, sent as context to reflect, and is not retained as a bank memory or saved in the ledger. Do not enter information you do not want sent to your configured provider. Suggestions never submit payments/promises or alter terms. Proposed dates after final due date call for bilateral amendment approval.
- **Promise tracker:** only the borrower can record a promise on an accepted agreement. Both parties can see it. Promises preserve amount in integer paise, date, note, borrower and a snapshot of already-reported payment IDs. Fulfillment allocates confirmed repayments reported after creation, oldest promise first, once per paise. Earlier reports, disputed and pending payments cannot fulfill a new promise. Partial unpaid promises become overdue after their date (UTC). Fulfillment after the date still has status fulfilled. Open promises plus pending payments cannot exceed available balance. No promise edit/delete or automatic amendment is included. An approved debt reduction can settle the ledger without fulfilling an older intention; promise fulfillment still requires qualifying confirmed repayments.
- **Hindsight events:** authenticated promise creation is retained as an explicitly labeled borrower intention, **not a verified repayment**. Confirmed-payment-derived fulfillment is retained once with source payment IDs and explicitly states it is not an extra payment. Regular pending/disputed payment claims remain excluded. The existing durable outbox syncs on a Memory ON insight request, not in the background.
- **AI memory timeline:** chronological source events are shown once with verified/intention/unconfirmed labels. Retrieved memories are deduplicated by memory ID and linked using returned event metadata/document IDs. Synthesized memories with no direct event are separately expandable. Retrieving an insight never adds a ledger event. Historical audit text is rendered more readably, while the persisted event is preserved.
- **Copy Reminder:** `/api/reminder` checks the session and agreement membership, then generates polite text from the latest confirmed balance and agreed final due date. The button copies locally only; it sends no email, SMS, push or message. If clipboard access fails, the generated text stays visible for manual copying.
- **Concise insights:** confirmed balance, final due date, concise remembered history, deterministic advisory next step, ON/OFF switch, and expandable evidence. Provider outages produce a truthful offline result with local calculations intact and no fabricated memories.

Existing SQLite records require no migration: the optional promises collection defaults to empty. No stack change or additional dependencies were introduced. A consistent pre-demo SQLite backup is in gitignored `data/backups/`; original agreements were compared against it and remained unchanged. The clearly labeled **Promise tracker demo · fictional** agreement is additional sample data, not a real money transfer.

To repeat the real new-feature API walkthrough against an already running development server:

```powershell
node scripts/verify-enhancements.mjs
```

This creates one new fictional agreement and uses your configured Hindsight service. It checks authorization, shared promises, payment confirmation/fulfillment, reminders, exact affordability, and real retain/recall/reflect. Sanitized output: `docs/enhancements-live-results.json`. No secret is printed.

## Repository packaging

The public repository includes source, placeholder-only `.env.example`, documentation and fictional demo screenshots. `.env.local`, all runtime data and SQLite backups, dependencies, build output and raw service-result JSON files are intentionally excluded. Detailed result transcripts referenced in verification documents are local generated artifacts; run the documented verification scripts with your own credentials to regenerate them. No real service key, bank namespace or private database is needed to build the app. Live tests are opt-in scripts; `npm test` uses isolated in-memory data and mocked provider transport.
