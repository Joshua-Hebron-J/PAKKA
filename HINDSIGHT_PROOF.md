# Hindsight proof — live verification passed

Verified November 6, 2026. See [VERIFICATION.md](VERIFICATION.md) for method, limitations, actual timestamps, source memory IDs, ON/OFF comparison, and isolation checks.

The final isolated transcript records **17 real provider calls (3 retain, 7 recall, 7 reflect), all HTTP 200**. The running development application was also tested with both demo sessions and real shared agreement memory. These are authenticated real calls, not mocks. Fictional test data is explicitly labeled, and the normal demo ledger remains intact.

- [Primary live transcript](docs/hindsight-live-results.json)
- [Running-demo ON/OFF output](docs/hindsight-demo-results.json)
- Official contracts checked: https://docs.hindsight.vectorize.io/api-reference/reflect/ and https://api.hindsight.vectorize.io/openapi.json

Banks are scoped per agreement using the private installation namespace plus SHA256 of the agreement UUID. Each route checks server session and agreement membership before selecting a bank; shared parties intentionally share memories. Verified lifecycle events and authenticated borrower intentions (explicitly labeled as intentions, not payments) are retained. Stable event document IDs support retry; unsynced events remain in the durable outbox. No provider key is exposed to the browser, logs or transcripts.

Live testing identified and corrected temporal grounding of reflections. Provider text remains an AI suggestion: inspect citations and use the deterministic ledger as authority.

## Focused tools update — November 6, 2026

The promise-aware live walkthrough also passed: four real retain operations (acceptance, labeled borrower intention, confirmed repayment, derived fulfillment), followed by real recall and reflect. See `docs/enhancements-live-results.json` and the current `VERIFICATION.md`. A subsequent browser request retained a second intention and displayed linked evidence.

Authenticated promise intentions are deliberately eligible for retain with an explicit "not a verified repayment" category. They are not represented as verified ledger events. Fulfillment is derived only from qualifying confirmed repayments, emitted once, and labeled as an outcome rather than another payment. Affordability is request-scoped reflect context, never a retained memory document. The evidence panel deduplicates returned memory IDs and links to event IDs; synthesized observations remain separate from ledger history.
