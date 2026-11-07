# PAKKA

Every Rupee. Every Promise. Remembered.

A local personal-finance and debt-accountability MVP: private income/expenses, monthly budgets, savings goals, a consent-gated Hindsight Money Coach, plus bilateral agreements, exact INR accounting, counterparty-confirmed repayments and reminders.

## Quick start

Use **Node 24.16.0** (the verified Node 24 release), npm and a writable `data` directory. The app uses the built-in `node:sqlite` module.

```powershell
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

Open http://localhost:3000. Choose **Asha Sharma** (designer) or **Rohan Mehta** (engineer), two fictional demo accounts. Sign out to switch accounts. Seed agreements are generated on first use; their dates are relative to first launch. Data persists in `data/pakka.sqlite`. Demo users are intentionally public selectable accounts, not production identity verification. Do not expose this demo to the public internet.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

## Walk through the prototype

1. As Asha, choose **New agreement** and propose a fictional ₹5,000 agreement at 0% interest.
2. Switch to Rohan and choose **Accept terms**. Record a ₹500 promise, then **Report payment** for ₹500. The balance stays ₹5,000 pending confirmation.
3. Switch to Asha and click **Confirm** on the payment. The remaining balance is ₹4,500. Inspect the fulfilled promise and its source repayment.
4. In the agreement’s **AI Insights**, choose **Compare insights** with **Memory** OFF, then ON. Expand **Show evidence** when connected. The amount continues to come from the local ledger.
5. Explore **Money Manager**, **Budgets** and **Savings Goals**. The personal **AI Coach** requires explicit consent before syncing confirmed personal records to its separate user bank.

The 7 November release checks passed **100 tests across 9 files**, lint, typecheck and the production build on Next.js 16.4.5. The isolated lifecycle check and real provider traces are summarized in [HINDSIGHT_EVIDENCE.md](HINDSIGHT_EVIDENCE.md). Use [SUBMISSION_GUIDE.md](SUBMISSION_GUIDE.md) for the exact recording sequence and database isolation. The demo works locally with provider memory disabled.

## Accounting and state rules

Amounts are integer paise; input accepts at most two decimal places. Annual simple rate is basis points (100 bps = 1% p.a.). Interest uses actual UTC calendar days / 365, rounded half up to one paise, computed once through final due date. There is no compounding, late fee or reducing-balance interest. Equal installment amounts allocate leftover paise to early installments and conserve the exact total; due dates divide the start-to-final-due interval evenly. This is an equal-payment schedule rather than an amortizing EMI product. Reminders apply to the final agreement due date, not individual installments.

Only accepted agreements enter dashboard totals. A reported payment reserves capacity but does not change the shared confirmed balance. Counterparty confirmation is final; a dispute has no balance impact and a corrected payment can be reported separately. Terms remain unchanged until the other party approves an amendment. Confirmed payments and past events have no edit/delete endpoint.

SQLite stores a shared agreement JSON aggregate, a sessions table and a separate `personal_finance` row for each user. Synchronous read/transition/write operations run without awaits, avoiding lost updates in one Node process. This local demo is designed for **one server process**, not distributed or multi-worker deployment. Native SQLite replaces the suggested Prisma stack to keep Node 24 setup lean. Styling uses custom responsive CSS instead of Tailwind.

## Hindsight setup

1. Obtain your own API key in [Hindsight Cloud](https://ui.hindsight.vectorize.io/) or use your configured compatible server. Service use may have charges; PAKKA does not create an account or purchase credits.
2. Put `HINDSIGHT_API_KEY` in `.env.local`; keep it server-only. Set `HINDSIGHT_API_URL` if needed.
3. Set `HINDSIGHT_BANK_PREFIX` to a unique private installation namespace (e.g. `pakka-joshua-20261105-<random>`). Keep it stable after first sync.
4. Restart Next.js, open an accepted agreement, turn Memory on, choose **Compare insights**. This explicitly sends unsynced verified lifecycle events and labeled eligible intentions to the service and performs real retain, recall and reflect requests. Compare with Memory off, which makes no provider request.
5. Inspect evidence IDs in the returned result. If credentials/network fail, the app displays the error and does not substitute fabricated output. Without a key it displays **Not connected**. Configured does not mean connectivity has been verified.

Memory sync is an explicit operation when requesting insights, not an unimplemented background task. Unsynced verified events form a durable outbox. Stable event document IDs allow retry/replacement after failure. Each agreement has its own bank, derived from its UUID plus the installation namespace. Every insight request checks the current session and agreement membership before selecting a bank. Credentials and bank selection never come from the browser. Current date/ledger calculations remain authoritative; AI suggestions cannot modify them. Demo seed events are clearly fictional sample records, not real-world payment evidence. See [HINDSIGHT_EVIDENCE.md](HINDSIGHT_EVIDENCE.md) for actual verification results.

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

## Premium PAKKA interface — November 6, 2026

The interface now uses the approved purple-and-white visual direction: an original code-native P-shaped handshake SVG (`public/pakka-mark.svg`), light desktop sidebar, white/lavender cards, compact financial summaries, warm advisory panels, clear status colors and mobile bottom navigation. The supplied mockup is only a visual reference; its people, amounts, payment claims and AI narrative are not application data.

Home selects a real accepted agreement (change it using the Agreement picker). It combines exact summary amounts, promises, live/offline AI insights, explicit-affordability suggestions, timeline/evidence, reminders, the existing agreement list and recent activity. Dedicated Promise Tracker, Timeline and AI Insights views use the same authorized workflows. View agreement & ledger opens the existing terms, amendment and payment-confirmation controls. On mobile, use the bottom navigation; reminders and account switching remain in the header. Account switching signs out through the existing real server session and returns a fresh sign-in to Home.

Memory is never fabricated or fetched automatically to fill the design. Choose Compare insights to request actual Hindsight context; OFF still uses the local ledger. Actual memory-ID citations may be shown as short numbered references that map to the unchanged IDs in Show evidence; unknown citations are left intact. Amounts explicitly labeled in paise are displayed as equivalent exact INR values. Raw storage, calculations and provider responses remain unchanged.

No new dependencies were added. Focus indicators, semantic control labels, native keyboard-operable forms/switches, reduced-motion support and narrow-screen layouts are preserved. These are visual/manual accessibility checks, not a claim of a complete accessibility certification. See the latest UI section in VERIFICATION.md and `docs/pakka-premium-desktop.png` / `docs/pakka-premium-mobile.png` for the verified result. Changes remain uncommitted pending approval.

## Initial PAKKA opening animation

A 2.7-second SVG/CSS sequence plays once per full document load: lavender/white background → illustrated hands slide together and shake → crossfade/scale into the unchanged `/pakka-mark.svg` asset → PAKKA and the exact tagline → fade to the app. It sits in the root layout and does not replay when changing views, submitting forms or switching demo accounts.

The app and its initial data request render independently behind a fixed decorative overlay. No readiness gate, sleep, added dependency or minimum request duration was introduced. The overlay never captures pointer events, takes focus or enters the accessibility tree; pointer/keyboard intent dismisses it immediately. `prefers-reduced-motion: reduce` shows only the genuine static logo/wordmark briefly (180 ms), with no hand, camera, particle or ambient motion. CSS hides the overlay even without hydration, with a 2.85-second JS removal fallback; interaction/timer/media listeners are cleaned up after dismissal. Fixed image dimensions and stable scrollbar gutters avoid shifting the brand when data arrives.

Refresh the local app to preview. Navigating within the app does not replay it. The reduced-motion preference is respected without changing the user's OS/browser settings. The existing loading/error view remains available if data takes longer than the opening.

## Private personal finance MVP

Choose **Money Manager**, **Budgets**, **Savings Goals** or **AI Coach**. On mobile, Money and Coach are primary tabs; **More** includes Budgets, Savings Goals and all existing debt tools. The purple-and-white branding, custom P handshake SVG and initial-only reduced-motion-aware opening animation are preserved. No new dependency was added.

- **Entries:** create, read, edit and delete confirmed income/expenses with UTC calendar date, category and optional note. Amounts are positive integer paise, at most ₹10 crore per entry, with at most two input decimals. Future confirmed entries, owner injection and invalid categories are rejected server-side. Categories are curated for this MVP rather than user-defined.
- **Reporting:** choose a month for exact recorded income, expenses, net cash flow, savings rate and expense category breakdown. Savings rate is net ÷ recorded income, rounded half up to two percentage decimals; without income it is unavailable. Negative cash flow remains negative. These are recorded flows, not a bank balance or a completeness claim.
- **Budgets:** one limit per expense category per month, including zero. Edit or delete a limit; spent/remaining/over-limit derive from matching confirmed expenses only.
- **Goals:** create/edit/delete targets and optional target dates; add or remove dated confirmed contributions. Targets cannot be below recorded contributions; contributions cannot exceed the remaining target. Contributions allocate existing money and never become a second expense, a transfer or additional income. Deleting a goal removes its allocation history only.
- **No double counting:** shared agreement repayments never import automatically. A user who wants a personal repayment expense must enter it once under Debt repayment. Confirming or disputing a shared payment cannot silently change personal totals. There is no bank connection, external account sync, transfer or investment feature.
- **Fictional samples:** each personal ledger starts empty. **Load fictional sample** requires an explicit action and an empty ledger; it creates three months of clearly fictional transactions, budgets and a goal. Fictional flags survive edits. The prepared Rohan demo contains these samples; Asha's personal ledger was left empty during browser QA. Samples never establish real income or affordability.

### Private AI Money Coach

Memory defaults **OFF**. Its ledger-only baseline uses current records with no provider calls. The conditional starter-saving cap is `min(10% of recorded monthly income, max(0, monthly net − same-month goal allocations))`, rounded down to a paise. Essential upcoming costs, opening balance, record completeness and future income are unknown. The cap is advisory and does not save or move money.

Memory **ON** alone does not contact a provider. Read the disclosure, check explicit consent, then choose **Sync confirmed records & ask coach**. This sends all current personal transactions and notes, goals, contributions and budgets to the configured Hindsight provider. Confirmed transactions are self-reported, not bank-verified; planned budgets/goals remain intentions. No personal provider requests occur on page load, edits, navigation or toggling memory. Empty never-synced ledgers make no provider calls.

Personal banks use a distinct `installation-prefix-personal-SHA256(userId)[0:24]` namespace. Shared agreement banks keep their existing UUID-based namespace. The authenticated server session chooses the user; clients cannot choose an owner or bank. Personal bank names and credentials are not returned to the interface. A stable `personal-ledger-current` document uses `update_mode: replace` on every explicit sync. Thus current records replace prior versions rather than appending edited/deleted records. **Local edits/deletions do not erase provider data immediately**: explicitly sync again to refresh the snapshot. Provider backup/retention policies still apply; no remote-erasure management UI is included.

Retention uses explicit INR sentences and source record IDs to avoid paise/rupee ambiguity. Recall and reflection include the authoritative current ledger and recorded monthly history. Evidence IDs expand separately; AI interpretation never modifies exact totals or agreements. A revision check rejects stale coaching if local records change during the request. Provider errors or invalid response shapes produce an honest offline fallback, not fabricated memories. AI interpretations remain fallible; current ledger calculations are authoritative. All demo accounts are publicly selectable in this local demo, so per-session privacy is **not production identity verification**.

### Reproduce personal-finance verification

Run the normal checks above, then `node scripts/verify-personal-live.mjs` after a production build. This makes real provider calls using fictional fixtures in a separate ignored SQLite database, a temporary production server on port 3219 and an isolated verification bank namespace. It does not edit the normal demo agreements. It verifies both private user banks, shared-bank separation, explicit consent, zero-call OFF, deterministic totals, authorization and replacement sync after deletion. Sanitized results stay local in ignored `docs/personal-live-results.json`; credentials are never printed. Temporary fictional provider banks remain in the configured account for inspection.

See [VERIFICATION.md](VERIFICATION.md) for actual results and [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for the finance walkthrough.

## Borrower amount update requests

Open an accepted shared agreement → **Agreement amount updates → Request amount update**. Only the borrower can request a new principal amount and must provide a reason. The lender sees a **Pending amount requests** inbox on Home and Agreements, with the current and proposed amounts. Both parties can inspect the reason and request history.

Amount requests use the existing bilateral amendment slot: one pending amendment at a time; only the lender can approve/reject a borrower amount request. The exact request UUID must accompany the decision, preventing duplicate decisions or stale responses acting on a newer request. **Pending** and **Rejected** requests never change active terms or balance. **Approved** requests replace the agreed principal only, retaining rate, start/due dates, installment count, notes and every confirmed repayment. Interest and outstanding balance recalculate under the existing fixed actual/365 rules; repayments are deducted exactly once. The summary labels the resulting amount **Agreed principal**, rather than implying an amended amount was the original principal.

The server rejects zero/fractional/out-of-range or unchanged amounts, blank/oversized reasons, pending-payment conflicts, unauthorized roles and a principal below already-confirmed repayments. The repayment floor also applies to general amendments, so they cannot bypass this protection. Approval revalidates after any intervening repayments; a now-invalid request can still be rejected. Budgets, personal records and private Money Coach banks are unaffected.

Proposal, approval and rejection each append an audit event and persist a request with old/proposed principal, reason, actor, timestamps and **Pending / Approved / Rejected** status. Only approval creates an agreed financial change eligible for the existing Hindsight outbox. It is retained on the next explicit agreement insights request; retries use the stable event document ID. No automatic provider sync, money transfer or external notification is added.

After `npm run build`, `node scripts/verify-amount-updates.mjs` verifies both roles via real HTTP on an isolated production server and fictional SQLite fixtures; when configured, it also performs real Hindsight retain/recall/reflect for the approved event. Results stay local in ignored `docs/amount-live-results.json`. It refuses to reuse an occupied verification port and never edits the normal demo ledger. `--serve` optionally holds the fictional fixture for browser QA until input or stdin closure.

## Cinematic intro and submission preparation

The current approved-reference replacement is a new **2D SVG/CSS composition**: compact illustrated wrists and coordinated hand contact, lavender/white background, a single restrained orbital light, and a centered reveal of the **unchanged custom P-shaped handshake logo**, Sora ExtraBold PAKKA wordmark and exact tagline. The old sleeve-heavy artwork is no longer used. Four feature labels complete the lockup: **Track Agreements / Manage Your Money / Grow Your Savings / AI Money Coach**. There is no stock image, WebGL runtime, video, large bitmap hand asset or new package. The intro lasts 2.7 seconds, never waits for fonts/data, and does not replay during normal app navigation.

It is decorative, not a substitute for genuine loading state or a progress bar. Application fetches proceed underneath, normal navigation never replays it, and pointer/keyboard input dismisses it immediately. Image failure also dismisses it. Independent CSS completion and a bounded JS timer prevent a stuck overlay; fixed positioning and explicit logo dimensions avoid layout shifts. The reduced-motion static logo disappears after 180 ms. Browser QA covers desktop/mobile and fixed-phase contact/logo inspection; physical low-end-device frame rates have not been benchmarked.

Before publication, run `node scripts/scan-staged-secrets.mjs` after staging the intended files. It scans **the complete Git index**, including unchanged tracked files, for configured credentials/bank namespace, common credential patterns and excluded runtime/build artifacts. Required source/docs/safe `.env.example` must exist in the index. `.env.local`, `/data/`, SQLite databases, logs, generated provider-result transcripts and build output remain excluded. Screenshot evidence uses fictional demo fixtures only.

GitHub repository visibility was checked through the GitHub connector: **public**. Under the requested approval rule, final source is prepared/staged locally, but commit and push wait for explicit approval to publish it to `Joshua-Hebron-J/PAKKA` on `main`. No deployment is part of this workflow. Remote/local SHA equality can be certified only after an approved push; it is not claimed while approval is pending.

## Typography and locally hosted fonts

PAKKA branding uses **Sora ExtraBold (800)**; all UI, headings, forms, tables and amounts use **Plus Jakarta Sans** with consistent hierarchy, line height and spacing. Currency figures use tabular numerals. Narrow-screen monthly metric captions keep the reporting month together instead of breaking at the hyphen.

Both are official variable font files stored under `app/fonts/` and loaded through `next/font/local`, with preloading, `font-display: swap` and metric-adjusted Arial fallbacks. The app makes no runtime Google Fonts CSS/font request, and builds do not fetch fonts from the network. Sora is 111,400 bytes and Plus Jakarta Sans 176,288 bytes; the original files are unmodified. Their redistribution licenses are included: [Sora OFL](app/fonts/Sora-OFL.txt), [Plus Jakarta Sans OFL](app/fonts/PlusJakartaSans-OFL.txt). The old DM Sans/Manrope CSS import has been removed.

The exact existing logo remains SVG. Font failure falls back to Arial without gating the app or intro. The brief static-logo reduced-motion state, input/asset-error dismissal, CSS completion and independent 2.85-second JS timeout remain in place. Existing financial and Hindsight code paths are unchanged.

Current visual evidence: [Current reference V4](docs/pakka-handshake-v4-logo.png), [Current reference V4](docs/pakka-handshake-v4-logo-mobile.png), [Current reference V4](docs/pakka-handshake-v4-desktop.png), [app typography](docs/pakka-jakarta-dashboard.png). Earlier intro screenshots in this repository are historical verification artifacts, not the current artwork. No commit, push or deployment was performed for this update.

## Original reference handshake replacement (V4)

The active illustration is now **`app/intro-handshake.tsx`**, newly drawn from the supplied **Professional Handshake with Glowing Swoosh** reference. It uses the correct dark thumb crossing above the light hand, four interlocking near fingers, a light back-of-hand with defined fingers, tapered purple and white/lavender sleeves, narrow cuffs and a restrained orbital sweep. It is 2D SVG with new curves and shading; no retired hand geometry, stock image, raster hand layer or 3D renderer is used. The exact P logo, Sora/Plus Jakarta typography, tagline and feature labels remain unchanged.

All hand paths were removed from `opening-animation.tsx`; it now imports the new illustration. The live SVG identifies itself as **`pakka-handshake-reference-v4`**. A regression test compares its **29 new paths** against **94 normalized retired-path fingerprints** and confirms **0 reused paths**. Retired selector/gradient names are absent from `app/` and `public/`. Hand artwork is inline SVG, so there is no separate cached hand-image URL. Fresh development replay and a fresh production build both rendered the new identity.

**Development-only Replay Intro:** `npm run dev` shows a **Replay Intro** button at the bottom right (above mobile navigation). It remounts only the decorative intro and preserves the current application/page state. The button is absent from production and test modes; this is verified by unit tests and an actual isolated production render. Normal page navigation still does not replay the intro. Duration remains 2.7 seconds, with reduced-motion static logo and the existing fail-open behavior.

Superseded intro-only screenshots were moved to ignored `data/retired-loading-artwork/`; documentation links now point to current reference V4 captures. Only fingerprints of retired paths are kept in source; the temporary raw source backup was removed. Current evidence: [desktop handshake](docs/pakka-handshake-v4-desktop.png), [mobile handshake](docs/pakka-handshake-v4-mobile.png), [logo reveal](docs/pakka-handshake-v4-logo.png), [mobile logo](docs/pakka-handshake-v4-logo-mobile.png). No financial data, Hindsight behavior, or branding was modified. No commit, push or deployment.

## Band AI review

Band AI Desktop performed a read-only review of PAKKA's Hindsight integration, agreement workflow, memory consent, and technical limitations. See the [Band AI review](docs/BAND_AI_REVIEW.md). The review did not rerun live-provider verification.
