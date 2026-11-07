# PAKKA video narration

Target runtime **3:35–3:55**, with the spoken text below and time for visible clicks. Use an isolated fictional agreement and follow [the recording setup](../SUBMISSION_GUIDE.md).

## 0:00–0:35 — Propose

**Screen** Open PAKKA, choose Asha Sharma, click New agreement, enter Fictional recording loan, ₹5,000 principal, 0% interest, today, a due date 10 days ahead, 2 installments and the fictional-only terms. Click Send for approval.

**Say** “PAKKA is a local prototype for keeping track of money agreements and the history behind them. Asha and Rohan are fictional demo accounts. As Asha, I propose a five-thousand-rupee agreement at zero interest, with two installments. The agreement appears as pending. Asha’s proposal starts the workflow, and Rohan’s acceptance determines when these terms become active.”

## 0:35–1:25 — Accept, promise and report

**Screen** Switch account to Rohan. Open Agreements, select the recording loan and click Accept terms. Expand Record a promise, enter ₹500 with a date two days ahead and click Record promise. Enter ₹500 as a repayment and click Report payment. Hold on the pending row.

**Say** “I switch to Rohan and open the same agreement. He can see the proposed terms and accept them. Now the outstanding amount is five thousand rupees. I record a promise to repay five hundred rupees. The promise has a date and appears in the tracker. Next I report a payment for that amount. The row still says pending, the promise is still pending, and the balance is unchanged. This is a record in the demo. Neither step moves money.”

## 1:25–1:58 — Confirm

**Screen** Switch account to Asha. Reopen the recording loan. Click Confirm beside the pending ₹500. Show ₹4,500 and the fulfilled promise. Expand its repayment evidence.

**Say** “I return as Asha and confirm the reported payment. The balance is now four thousand five hundred rupees. The promise is fulfilled because the app can match it to an eligible confirmed repayment. Here is the repayment evidence in the tracker. I can switch back to Rohan and see that same shared result. The balance comes from the application ledger, with currency stored as integer paise.”

## 1:58–2:25 — Memory OFF

**Screen** Stay in the agreement. Under AI Insights, turn Memory OFF and click Compare insights. Show balance, due date and lack of memory evidence.

**Say** “Now I’ll compare the same agreement with memory off and on. With memory off, PAKKA shows the current confirmed balance and due date using its own ledger. This request returns before it contacts Hindsight. The normal agreement and payment workflow is available in this mode.”

## 2:25–3:22 — Memory ON

**Screen** Turn Memory ON, click Compare insights and wait for the actual response. Expand Show evidence. Open a related timeline event’s Source & evidence. If needed, briefly show the operation summary from HINDSIGHT_EVIDENCE.md as a separate verification run.

**Say after a successful response** “With memory on, I explicitly ask for another comparison. For a fresh agreement, PAKKA sends eligible unsynced records to Hindsight through retain. A borrower promise is marked as an intention. A confirmed payment is marked as a verified application event. Recall retrieves facts from the bank for this agreement. Reflect turns that context into an explanation. Here I can expand the evidence and inspect the memory reference next to the application’s own timeline. The explanation can bring the history together. The balance remains four thousand five hundred rupees.”

**Fallback if the request fails** “This request returned an offline or unavailable status. The local balance and due date are still visible. The evidence report documents a separate successful run.” Use the status actually on screen. Save the successful live segment for a later take.

## 3:22–3:50 — Close

**Screen** Hold on the confirmed balance and the evidence or fallback. Show the repository link.

**Say** “I use this boundary to keep financial state easy to inspect. PAKKA owns the recorded agreements, confirmations and arithmetic. Hindsight can supply context around those records. This instance uses local storage and fictional demo accounts. You can follow the workflow and read the adapter in the repository.”
