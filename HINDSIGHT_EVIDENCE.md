# Hindsight evidence for PAKKA

Verification date **7 November 2026, IST**. These are observed HTTP results from isolated local application instances using separate SQLite files and fictional fixtures. The provider requests were real. The amounts and confirmations describe demo records only.

## Recorded runs

| Run                                                       | Observed result                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agreement lifecycle, 11:23:06–11:23:26 IST                | Separate Asha and Rohan demo sessions. Lender self-acceptance denied. Borrower accepted ₹5,000 at 0%. A ₹500 promise and reported payment left ₹5,000 outstanding. Lender confirmation fulfilled the promise and reduced the balance to ₹4,500. OFF returned `disabled`. ON returned `connected`, marked **4 events** synced, returned **6 recalled facts** and **4 evidence items**. |
| Agreement scope and provider trace, 11:24:09–11:25:09 IST | **13 provider HTTP 200 responses**, comprising **3 retain**, **5 recall**, and **5 reflect**. OFF made zero provider calls. Foreign and unauthenticated access was rejected. Both authorized participants shared a bank for the shared fixture. The second shared query issued no duplicate retain. Recalled source agreement IDs matched the requested scope.                        |
| Private coach, 11:24:09–11:25:01 IST                      | **12 provider HTTP 200 responses**, four per operation. OFF made zero provider calls. ON required explicit consent. The two fictional users returned **21 evidence items each**. Cross-user deletion was rejected. A later approved sync replaced the edited snapshot. Shared agreement memory remained separate.                                                                     |
| Amount amendment, 11:24:10–11:24:25 IST                   | Lender approval preserved ₹250 confirmed repayment and changed the outstanding balance to **₹550.01**. Replay and stale decisions were rejected. A live ON request retained the approved event, recalled and reflected, and returned **6 evidence items**. The other amount-request events remained unsynced.                                                                         |

Counts belong to their individual runs. The lifecycle and amendment runs asserted successful adapter responses and evidence rather than capturing each upstream HTTP status. The 13-call and 12-call runs recorded upstream statuses through forwarding proxies. The table reports those observations and makes no claims about typical latency.

## Trace the implementation

1. `app/api/insights/route.ts` resolves the current session and authorizes membership before invoking the provider adapter. The borrower can supply request-only affordability. The agreement ID and server-side installation namespace determine the bank.
2. `lib/store.ts` records agreement and repayment transitions. A reported payment stays pending until counterparty confirmation. An authenticated borrower promise is eligible memory as an intention. The four eligible events in the lifecycle fixture were acceptance, promise recorded, repayment confirmed and promise fulfilled. The creation and payment-reporting events remained outside the eligible outbox.
3. `lib/hindsight.ts` computes the local result first. OFF returns immediately. ON selects unsynced eligible events, POSTs each to `/memories` using the event ID as document ID, and sets the local synced flag after success. It then calls `/memories/recall` and `/reflect` on the same agreement bank.
4. The query includes the current confirmed balance and due date. Reflection is an interpretation and has no ledger mutation path. The app prefers reflection supporting facts when present and otherwise shows recall results. `app/agreement-tools.tsx` displays **Show evidence** and timeline **Source & evidence**. Metadata can connect a returned fact to its source application event.
5. `lib/personal-memory.ts` uses a separate user-scoped bank. Its retain operation replaces one stable current-snapshot document after consent. Local edits and deletes reach the provider on the next explicit sync. Provider backup erasure and exactly-once delivery are outside this prototype.

## Reproduce and show the result

Build with `npm run build` using Node 24.16.0. With a valid local Hindsight configuration and network access, run:

```powershell
node scripts/verify-hindsight-live.mjs
node scripts/verify-personal-live.mjs
node scripts/verify-amount-updates.mjs
```

Each script starts an isolated local instance and uses fictional verification banks. The release lifecycle was run using the request sequence from `scripts/verify-enhancements.mjs` against a separate SQLite database and port. The legacy verifier defaults to port 3000 and writes demo records there. Use [the isolated click-through](SUBMISSION_GUIDE.md) to repeat the lifecycle without modifying the normal demo.

The machine reports in `docs/*results.json` and `data/release-workflow-results.json` remain local and ignored. They can include fixture IDs and generated text. The summary above is the publication-safe evidence. Keep environment variables, private bank identifiers, cookies and raw traces out of recordings. The UI can show evidence IDs for fictional fixtures.

For an actual recording, run OFF first on a fresh agreement, then ON. Show the unchanged balance alongside the evidence returned by the live request. If the UI reports **Offline** or **Not connected**, show that state and describe the table as a separately verified run. Provider output is variable and should be checked against the underlying event.

The app is a single-server local prototype with selectable fictional sessions, a SQLite ledger and advisory AI responses. This evidence does not establish production security, verified financial activity, bank transfers, performance at scale or any deployed multi-device service.

[Hindsight source](https://github.com/vectorize-io/hindsight) · [Hindsight documentation](https://hindsight.vectorize.io/) · [Agent memory explanation](https://vectorize.io/what-is-agent-memory)
