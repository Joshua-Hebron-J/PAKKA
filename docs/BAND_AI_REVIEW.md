# Band AI — PAKKA Read-only Review

Source: Band AI Desktop review exported 2026-11-07. This is the reviewer's final assessment, extracted from the full conversation export; tool logs, machine-local paths and participant identifiers are excluded. No fresh tests were run for this document.

Read-only review completed. No files changed, packages installed, migrations run, or deployment actions taken. I inspected source and HINDSIGHT_EVIDENCE.md; I did not rerun live-provider verification.

Verified strengths
1. Real retain → recall → reflect integration: eligible unsynced events are retained with stable event document IDs and source metadata; synced is marked after a successful response. Reflection evidence is returned, with recall evidence as fallback. References: lib\hindsight.ts:75, :110, :125.
2. Memory is scoped and gated: insights authorizes agreement membership before provider access; each agreement has a namespaced bank. Personal coaching uses a separate user-scoped bank and requires explicit sync consent. References: app/api/insights/route.ts:8; lib/hindsight.ts:71; lib/personal-memory.ts:7, :56.
3. The ledger remains authoritative: local calculations are computed first; prompts include the confirmed balance and distinguish intentions from payments. Provider failure returns local advice, and reflection has no ledger-transition path. References: lib/hindsight.ts:35, :53, :104; app/api/insights/route.ts:18.

Agreement and repayment behavior
The creator becomes lender and proposes pending terms. Only the borrower can accept or reject a pending agreement. Accepted agreements allow payment reports from either participant. Reports stay pending; only the other participant can confirm or dispute them. Only confirmed payments reduce the balance. Pending payments reserve available balance to prevent over-reporting. Amendments require counterparty approval; borrower amount-update requests specifically require lender approval and reject stale request IDs. References: app/api/action/route.ts:42; lib/store.ts:213, :236, :299, :326, :423. These are application acknowledgements, not verified bank transfers.

Memory ON versus OFF
OFF computes local ledger advice and returns disabled with empty evidence before making provider calls. ON requires configuration, syncs eligible events, recalls and reflects within the scoped bank. Pending payment reports and initial proposals are excluded; authenticated borrower promises are included but explicitly labelled intentions. Personal ON additionally requires consent and replaces a stable current-snapshot document. OFF does not delete previously retained provider data. References: lib/hindsight.ts:55, :75; lib/store.ts:287; lib/personal-memory.ts:48, :112.

Three recommended improvements
1. Replace selectable demo identities with authenticated accounts and verified participant binding before using real personal data. Verified basis: signin issues a session for a supplied known demo user without credential verification. References: app/api/action/route.ts:21; lib/store.ts:181.
2. Serialize per-bank sync and add durable outbox/revision controls. Verified basis: agreement pending events are captured before awaited provider calls, without a claim/lock; concurrent requests can submit the same event and return advice from an older snapshot. Personal revision checks detect changes but do not serialize competing snapshot replacements. Add concurrency, crash/retry and stale-snapshot tests. References: lib/hindsight.ts:75–96, :104; lib/personal-memory.ts:112–130, :169. These risks are source-derived, not reproduced failures.
3. Add an explicit provider-memory deletion flow and clear pending-deletion status. Verified basis: personal edits/deletes reach Hindsight through the next consented snapshot replacement; OFF itself performs no deletion. Offer a separate erase action with retries and explain provider retention limits. References: lib/personal-memory.ts:83–127; HINDSIGHT_EVIDENCE.md, “Trace the implementation,” item 5.

Evidence boundary: HINDSIGHT_EVIDENCE.md records isolated fictional-fixture runs, including 13 shared-memory and 12 personal-memory provider HTTP 200 responses, zero OFF calls, and rejected unauthorized access. Those are recorded observations, not fresh results from this review. This remains a local prototype; this review does not establish production readiness.
