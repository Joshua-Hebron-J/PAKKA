# Verification — November 6, 2026

## Final result

Live Hindsight connection verified using the configured server-side credentials. Actual retain, recall and reflect calls succeeded. Memory isolation and memory ON/OFF passed. Development server is running at http://127.0.0.1:3000 for the browser demo; it was started using npm run dev after probes found no PAKKA server on ports 3000 or 3001. No deployment or GitHub push was performed. No API key is included in these artifacts.

## Local checks

- npm test: **22 tests across 4 files passed**.
- npm run lint: passed.
- npm run typecheck: passed.
- npm run build: passed (Next.js 16.4.5; .env.local loaded server-side).
- The production build was used by the separate live isolation server; it was stopped after verification. The primary development server remains running.

## Actual live API proof

Primary verification: 6 Nov 2026, 1:26:32 pm to 6 Nov 2026, 1:28:42 pm IST. 17 recorded upstream calls: 3 retain, 7 recall, 7 reflect, all **HTTP 200**. This includes the initial partial attempt and its resumed checks against the same banks. An earlier pre-fix probe made another 11 successful calls; its sanitized transcript is retained separately.

The isolated harness uses real production HTTP routes, real separate opaque-cookie Asha/Rohan sessions, a separate SQLite file, and a local forwarding recorder that passes requests to the configured real Hindsight endpoint. Provider responses are not mocked. Three fictional fixture agreements were retained, with one verified synthetic event each. These are test fixtures, not real financial activity. The normal demo ledger was not replaced. Bank prefix and credentials are redacted from transcripts.

- [Final sanitized upstream transcript](docs/hindsight-live-results.json)
- [Initial pre-fix transcript](docs/hindsight-live-initial-results.json)
- [Intermediate test-assertion diagnostic](docs/hindsight-live-intermediate-results.json)
- [Running application demo transcript](docs/hindsight-demo-results.json)

## Memory isolation actually tested

PAKKA's authorization boundary is **agreement membership**, not one private bank per demo user. Both parties intentionally see the same agreement memory.

1. Asha-only fixture (with fictional counterparty verification-only-a): Rohan cannot see the agreement in state or access its insights with memory ON or OFF.
2. Rohan-only fixture (with fictional counterparty verification-only-b): Asha has the same denial. These private fixtures exist only in the isolated verification database because normal two-user creation makes both demo users parties.
3. Recorder confirmed denied requests made **zero upstream calls**. Unauthenticated insight requests were also rejected.
4. Authorized private calls returned source metadata for the correct agreement; no opposing markers appeared. Source IDs are used for assertions because Hindsight may omit arbitrary prose markers during extraction.
5. Shared fixture: both users received evidence from the same bank. The second user performed recall/reflect with **zero duplicate retains**.
6. Asha was rechecked after all three banks had data; returned source agreement IDs still matched only her private fixture.

These checks establish application-level membership checks and bank scoping. They do not turn the public demo account chooser into production identity verification, or prove provider-side tenant security beyond the tested API behavior.

## Memory ON versus OFF in the running demo

Agreement: **A little help for the big move**, ID `5ef672a8-dabb-4445-927e-f16274a81ef7`. Verified 6 Nov 2026, 1:27:53 pm IST through http://127.0.0.1:3000.

**OFF:** Current confirmed balance: ₹20,000.00. 1 confirmed payment(s). Due 2026-11-10. Without memory, no historical behavior is inferred.

**ON:** Real reflect summarized the original ₹25,000 interest-free agreement and confirmed ₹5,000 repayment, with ₹20,000 remaining, final due date November 10, 2026, and insufficient evidence of repeated historical delays. These historical facts had the following real evidence:

- Memory ID `50248998-b568-4d62-be83-d17fa13a8b30`: Both parties confirmed a ₹5,000 repayment toward the moving deposit. | When: 2026-10-26 | Involving: Both parties
- Memory ID `faaacae7-af3b-4ee9-9544-01d54d0cf0aa`: Both parties agreed to a moving deposit of ₹25,000 with no interest. | When: 2026-10-06
- Memory ID `3ab1acb7-319d-477f-aaa6-ce61c3532048`: The moving deposit is ₹25,000 with no interest.

The full unedited, sanitized reflect text is in the demo transcript. Both Asha and Rohan received real evidence from the shared bank. ON adds historical context and citations; it does not change ledger balance or terms. OFF has no history retrieval and zero provider calls (measured on both private fixtures).

## Fixes and regression coverage

- Live pre-fix output incorrectly described a past due date as upcoming. Reflection now receives today's UTC date, authoritative current balance, final due date and deterministic due status. It explicitly distinguishes an overdue balance from evidence of repeated historical delays. Post-fix output correctly described the overdue fixture and the due-soon real demo agreement.
- Reflection now requests inline source memory IDs for historical claims; observed live output contains those IDs.
- Empty reflect evidence lists now fall back to genuinely recalled evidence rather than hiding available facts.
- Provider recall/reflect response shapes are validated; malformed text is rejected rather than claiming a connected insight.
- Added regression tests for temporal grounding, empty-evidence fallback and malformed responses.
- The live test's brittle prose-marker requirement was replaced with provider-returned agreement metadata; extraction is allowed to omit arbitrary marker wording. The failed assertion did not represent an authorization or provider error.

## Repeat and browser demo

Open http://127.0.0.1:3000, sign in as either user, select **A little help for the big move**, leave Memory ON and choose Compare insights. Toggle OFF and compare the deterministic baseline. Existing verified events are already retained.

To repeat isolated live checks (performs real API usage and creates fictional test banks):

```powershell
npm run build
node scripts/verify-hindsight-live.mjs
# Resume a failed run without re-retaining synced fixture events:
node scripts/verify-hindsight-live.mjs --resume
# Reuse an already-running dev server and verify one existing shared agreement:
node scripts/verify-hindsight-demo.mjs
```

Test banks and gitignored fixture SQLite files are retained as evidence; no destructive cleanup was performed. The earlier local-core verification is preserved in docs/verification-2026-11-05.md.

## Final secret-safety check

Scanned 75 source, report and browser-static files for the configured API key: **zero matches**. The key was loaded only in memory for comparison and was never printed. The environment file remains unmodified and gitignored.
