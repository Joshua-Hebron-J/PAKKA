# Designing a money coach with an explicit memory boundary

I wanted to know what a personal finance assistant could add to a screen that already shows the numbers. If the current month has ₹65,000 in recorded income and ₹26,900 in recorded expenses, I can calculate ₹38,100 net cash flow without a model. A model might help explain a pattern across earlier months or suggest a question to ask before changing a budget. I wanted those two jobs to stay distinguishable when I switched memory on and off.

That question became the private Money Manager and AI Coach in PAKKA. My example uses a fictional Rohan account with an explicitly loaded sample. It shows the month, the categories behind the amounts, and a savings rate of 58.62 percent. A savings goal can have a recorded allocation without that amount appearing again as an expense. A confirmed shared repayment also stays in the shared agreement ledger unless the user records a personal expense separately. If I counted either of those twice, a polished narrative would simply make a wrong total easier to believe.

## I start with records the user can inspect

The personal ledger lets a demo user enter dated income and expenses, set category budgets and record allocations to goals. The application treats entries as confirmed by the user. That confirmation has a narrow meaning. It identifies the records the application should include in its calculations and in an explicitly approved sync. It does not establish that the account holder received a salary or that any bank transferred money.

I calculate each month's numbers before asking for advice. Integer paise keep decimal currency amounts stable during addition and subtraction. Category limits are compared with recorded expenses for the same category and month. Goal allocations reduce the amount available for a conditional savings suggestion while staying separate from expense totals. I find that distinction easier to explain by opening the goal history and the monthly totals side by side than by asking an assistant to infer what happened from free text.

For the sample with ₹38,100 net flow and a ₹5,000 current-month allocation, the local starter cap is ₹6,500. Ten percent of recorded income is the smaller of the two constraints in that example. The cap is conditional on upcoming costs and the completeness of the entries. The application can display that calculation even if I have no connection to the memory service. I would be misleading myself if I treated it as a recommendation to move money immediately, since the entries do not establish a bank balance or guarantee that the coming month's bills are covered.

## I treat the switch and the sync as separate actions

The private coach starts in Memory OFF. With memory disabled, I can ask for a ledger-only comparison. A page load, a local edit or a switch flip does not send my notes to Hindsight. To use provider memory, I turn Memory ON, read the disclosure, check the consent box and press **Sync confirmed records & ask coach**. The server also checks the consent flag. That last check matters because a UI control by itself cannot enforce a server-side boundary.

This differs from PAKKA's agreement memory. A shared agreement accumulates eligible events that can be retained using stable event document IDs. In a private ledger, a person can edit or delete a record. If I only appended new statements, recall could later pick up a fact that was valid before the edit. I chose to send a current personal snapshot on each explicit sync and replace the provider document. The snapshot contains the current records, with goal plans and allocations clearly distinguished from income and expenses.

The personal coach uses these fields on its retain item. They are excerpted from the request in the adapter.

```ts
document_id: document,
update_mode: "replace",
```

Here, the document variable is the stable personal ledger document name. It is scoped to the user's personal bank. The same document name can appear in separate banks without merging those accounts. The server chooses the bank based on the authenticated demo user and an installation namespace. Agreement memory uses a separate bank naming pattern derived from agreement IDs. I find the visible difference between these two sync strategies more useful than describing every record as a generic memory. Event history and editable snapshots represent different retention needs.

An edit on the local machine takes effect locally right away. The previous provider snapshot remains until the next explicit replacement sync. I do not describe a local delete as instant remote erasure, and I do not make claims about a provider's backups. For a demo I use only fictional notes and entries that I am prepared to send.

## I separate evidence from interpretation

After retain, the coach calls recall and reflect. Recall supplies prior material from the scoped bank. Reflection can interpret patterns in that material and offer a next step. The local totals and the conditional cap appear separately from the generated interpretation, so I can compare advice with the inputs that constrain it. The adapter includes the current ledger and its revision when constructing the request. If the local revision changes during the work, the app avoids presenting the response as advice for a current snapshot.

I also format currency in INR when constructing retained statements. Numbers such as 6500000 are convenient for arithmetic in paise and ambiguous in a natural-language memory. I prefer sending an explicitly formatted amount so a retrieved statement can be read without silently changing its unit. The ledger retains the integer amount. The provider receives a human-readable representation with enough context to preserve the meaning. I treat any claim returned by the model as something to inspect against those original records.

When I demonstrate the coach, I first show the ledger-only view, then explicitly sync the same fictional data and expand the returned evidence if the provider responds. That comparison is useful because the arithmetic remains the same in both views. If I see an observation about a spending pattern, I can open the referenced material and check which entries or periods support it. If I get an offline status, I keep showing the local result and say what happened. It is still a meaningful product test because it shows which capabilities depend on the provider.

## What this prototype can establish

I can demonstrate consent checks, user-specific bank selection and exact ledger arithmetic on a local instance. I can exercise two selectable roles and test that a request cannot cross the membership boundary. The prototype does not give me production identity verification, encryption of a user's local database, bank connectivity, investments or transfers. Running one small fictional dataset also gives me no basis for a benchmark. I would want separate evaluation of misleading summaries, stale records and failure cases before trusting the coach with a more consequential decision.

My main design test is whether I can turn memory off and still explain every number on the screen. I want a user to know when the application is calculating a value, when it is sending records to a provider and when it is interpreting retrieved history. Keeping those operations separate made it possible to build a useful coach around an ordinary personal ledger without making the ledger depend on a model's account of what happened.

For the release exercise I compared two fictional personal accounts through real provider requests. The trace captured four successful retains, four recalls and four reflections across both personal accounts, a shared fixture and a replacement test. The private queries returned evidence for each account and the workflow rejected a cross-user delete. The comparison also held the provider call count constant when memory was off. Those checks help me describe what I actually observed. They do not tell me how faithfully a model would summarize every possible spending history, which is why I still show the original entries beside the coach.

I used Hindsight's retain, recall and reflect interfaces and the accompanying explanation of agent memory as references for that boundary. [Hindsight repository](https://github.com/vectorize-io/hindsight) · [Hindsight](https://hindsight.vectorize.io/) · [What is agent memory?](https://vectorize.io/what-is-agent-memory) · [PAKKA source](https://github.com/Joshua-Hebron-J/PAKKA)
