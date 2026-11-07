# PAKKA submission demo guide

Use a separate local SQLite database for recording. The normal demo database keeps its existing agreements, sessions and personal records. Use fictional names, notes and amounts throughout.

## Prepare the recording instance

From the project root, use Node 24.16.0 and install from the lockfile with `npm ci` if dependencies are missing. Keep provider credentials in `.env.local`. In a separate PowerShell terminal, choose a fresh database filename and an unused port.

```powershell
$env:PAKKA_DB_PATH = 'data/pakka-recording.sqlite'
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3010
```

Choose a different filename on each rehearsal if you want a clean run. For live provider calls, set a fresh private bank prefix for this instance before startup. Keep credentials, prefix values, server logs and response headers outside the capture. Open http://127.0.0.1:3010 and let the intro finish. Record at 1920×1080. Use the narration in [video-script.md](submission-content/video-script.md).

## Click-by-click run

| Time      | Screen actions and expected evidence                                                                                                                                                                                                                                                                                                                                                    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:35 | Choose **Asha Sharma**. Click **New agreement**. Enter `Fictional recording loan`, principal `5000`, interest `0`, today as start, a final due date 10 days later, `2` installments and `Fictional demo only. Repay in two installments.` Click **Send for approval**. Show the pending row.                                                                                            |
| 0:35–0:55 | Click the avatar with the accessible label **Switch account** and choose **Rohan Mehta**. Open **Agreements**, select the fictional recording loan and click **Accept terms**. Show ₹5,000 remaining.                                                                                                                                                                                   |
| 0:55–1:25 | In the agreement, expand **Record a promise**. Enter `500` and a date two days ahead, then save with **Record promise**. Enter `500` in the repayment field and click **Report payment**. Show the pending ledger row, pending promise and unchanged ₹5,000 balance.                                                                                                                    |
| 1:25–1:58 | Switch account to **Asha Sharma**. Open the same agreement and click **Confirm** beside the reported ₹500. Show ₹4,500 remaining and the fulfilled promise. Open its repayment evidence.                                                                                                                                                                                                |
| 1:58–2:25 | In this agreement’s **AI Insights** section, turn **Memory** OFF and click **Compare insights**. Show the confirmed balance, due date and the absence of retrieved evidence. This action returns before the provider adapter sends any requests.                                                                                                                                        |
| 2:25–3:22 | Turn **Memory** ON and click **Compare insights**. On the fresh agreement, the request retains eligible unsynced events and then calls recall and reflect. Wait for the real result. Expand **Show evidence**, show a memory ID and open **Source & evidence** on the corresponding timeline event. Point out the distinction between the recorded promise and the confirmed repayment. |
| 3:22–3:50 | Show that the confirmed balance is still ₹4,500. Explain the separate local ledger and scoped memory bank. Briefly show the repository or an approved screenshot of the evidence report.                                                                                                                                                                                                |

If your demo opens a different agreement from the sidebar, return to **Agreements** and reopen the exact recording loan. Both participants see the shared agreement after signing into their own demo sessions. The app makes the consent-gated personal Money Coach available separately. Keep it optional for a 3–4 minute recording.

## Live calls and fallback

Rehearse on a disposable agreement, then create a fresh agreement for the recording so the first ON comparison has unsynced events. The agreement UI shows the resulting explanation and evidence rather than separate retain, recall and reflect counters. For operation-level proof, show the sanitized summary in [HINDSIGHT_EVIDENCE.md](HINDSIGHT_EVIDENCE.md). A second ON query may only recall and reflect because the outbox entries are already synced.

If the current result is **Not connected** or **Offline**, say what the screen shows and continue with the ledger-only comparison. Clearly label the evidence report as a previous run. Record a fresh successful ON segment later if the submission needs a live result. Trim waiting footage between the click and the actual result and leave the sequence visible.

For the live demo, keep the two demo roles and the isolated database ready. Use the same sequence without editing the main demo records. Review the exported video and current organizer form before submitting anything.
