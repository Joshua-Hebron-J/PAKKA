# Verification — November 5, 2026

- `npm run lint`: passed, no warnings/errors.
- `npm test`: passed, **20 tests across 4 files** on Vitest 5.1.0.
- `npm run typecheck`: passed.
- `npm run build`: passed on Next.js 16.4.5 / Node 24.16.0. All five API route handlers and dashboard generated successfully.
- Dependency installation audit after patched development dependencies: **0 vulnerabilities** (374 packages audited).

## Browser checks actually performed

Using the real local Next.js server and SQLite database, not a mocked API:

1. Asha signed in with a server session and created Laptop bridge: ₹10,000, no interest, two equal payments.
2. Signed out and signed in as Rohan; accepted the exact proposed terms.
3. Rohan reported ₹2,500. Shared balance stayed ₹10,000 while pending.
4. Switched to Asha; confirmed that payment. Balance changed to ₹7,500.
5. Switched back to Rohan; independently verified the same ₹7,500 remaining.
6. Requested memory with no key: real UI showed Not connected, no evidence, and a deterministic ₹7,500 baseline.
7. Inspected dashboard at desktop width 1440 and phone width 390. Phone document width matched viewport (no horizontal overflow), account switch remained visible.
8. Saved `docs/dashboard.png`. Local preview server stopped during final teardown; restart with `npm run dev`.

The browser-created Laptop bridge record remains in the local SQLite data as a coherent walkthrough result. Runtime data is gitignored.

## Automated coverage

Exact paise parsing, rounding, actual/365 simple interest, equal-payment installment allocation, reminders; opaque sessions; foreign-party read/mutation/insight denial; borrower-only acceptance; counterparty-only confirmation/dispute; partial payments, pending reservations and overpayment prevention; immutable settled payments; bilateral amendments and revalidation after intervening repayments; malformed inputs; cross-origin rejection and loopback Host handling; Hindsight no-key/off behavior, scoped retain/recall/reflect payloads and retryable outbox failures.

Hindsight transport tests use an explicitly mocked fetch in tests only. They are **not authenticated live service proof**. No live retain/recall/reflect call was performed because no API key was supplied. See HINDSIGHT_PROOF.md. No push, deployment, public post, purchase or paid service call was made.
