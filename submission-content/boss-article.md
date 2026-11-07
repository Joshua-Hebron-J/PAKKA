# What I let an AI remember about a shared debt

I built PAKKA around a familiar disagreement. Two people remember the same repayment differently. One remembers promising to pay, the other remembers seeing a payment notification, and neither can reconstruct which terms they actually agreed to. In a conventional chat interface, those statements all look like text. In a debt ledger, they represent different states with different consequences. I wanted an assistant that could explain the history without collapsing those distinctions.

PAKKA is a local prototype with two fictional accounts, Asha and Rohan. I use them to demonstrate both sides of an agreement. Asha can propose a ₹5,000 principal at zero interest. Rohan can accept the terms and record a ₹500 repayment promise. Reporting that payment leaves ₹5,000 outstanding. When Asha confirms it, the ledger shows ₹4,500 outstanding and the eligible promise becomes fulfilled. I can switch accounts and see the same shared balance. The confirmation establishes what the two demo participants recorded in the app. It has no connection to a bank statement.

## I put the state transition first

I keep the authoritative state in SQLite and represent rupee amounts as integer paise. Interest uses the agreed principal, the annual rate in basis points and the date range under an actual/365 simple interest convention. My demonstration uses zero interest so a viewer can follow every change without doing interest arithmetic. A proposed agreement contributes to the active totals only after acceptance. A proposed amendment leaves the current terms in force until the other participant approves it.

This design shapes what I send to Hindsight. An accepted agreement, a confirmed repayment and an approved amount amendment can be remembered as lifecycle events. A borrower promise can also be useful context, provided that the record identifies it as an intention. A reported but unconfirmed payment remains visible in the application timeline without qualifying as a verified event for retention. The conversation may contain all three kinds of statement. The adapter has enough information to label and select them before an external request happens.

Here is the selection rule in PAKKA's shared agreement adapter. The flags come from the application's event transitions.

```ts
const pending = d.events.filter(
  (e) => (e.verified || e.memoryEligible) && !e.synced,
);
```

That small predicate carries two separate decisions. The first pair of flags controls eligibility. The last flag records whether a successful retain has been acknowledged locally. For each eligible event, I send its timestamp, stable event ID as the document ID, and metadata containing the event and agreement IDs. I mark the stored event as synced after the retain request returns successfully. A later comparison can recall and reflect over the same bank without resending events already marked synced. A failed request leaves the event available for retry. There is still a failure window between remote acceptance and local acknowledgement, so I describe the design as an outbox with stable identifiers rather than promising exactly-once delivery.

## I scope retrieval to the agreement

Asha and Rohan need access to the same history when they are participants in the same agreement. They also need to be unable to ask the adapter for an unrelated agreement merely by obtaining an ID. I handle the distinction on the server. The route authenticates the demo session, checks membership, and then calls the adapter. The adapter derives the bank from the installation namespace and a hash of the agreement ID. The client chooses an agreement to inspect, while the server decides whether the request is authorized and which bank it can use.

That arrangement matters when I test the feature. A successful response from a provider says little about isolation by itself. I want to verify that a denied request stops before the provider receives anything and that two authorized participants can share one bank. I also want source identifiers in the returned evidence to match the agreement under inspection. A marker buried in free text can be omitted during extraction. Agreement and event metadata provide a more reliable way to audit what the adapter retrieved.

I keep the provider credential on the server and use disposable fictional fixtures for live verification. The two account buttons issue distinct sessions, which lets me exercise the membership checks and counterparty transitions. Those account buttons are deliberately open to anyone with access to the local demo. They are useful for testing application roles. I would need an actual identity system and a separate security review before putting private user finances behind the same interface.

## I make the comparison visible

I use the Memory switch and **Compare insights** to explain what Hindsight adds. With Memory OFF, PAKKA calculates the current confirmed balance and a local next step. The early return happens before the adapter calls the provider. If I want to discuss a suggested repayment, I can give the application an amount I can afford and an availability date as the borrower. The result is advice based on explicit inputs, with no assumed income.

With Memory ON, an explicit comparison first retains any unsynced eligible events. It then requests recall and reflection. I include the current confirmed balance, due date and current promise statuses in the query because a remembered fact may predate a repayment or an amendment. The prompt tells the service to treat the current snapshot as authoritative and asks for source references for remembered claims. The response can explain which confirmed events mattered and how a promise relates to a later payment. The response has no write path back into the financial ledger.

In the UI I expand **Show evidence** and inspect the source references. The adapter can use supporting facts supplied with the reflection, or the recall results when the reflection lacks its own facts. A provider memory ID helps me inspect an interpretation. An application event ID lets me check the underlying recorded event. I want viewers to see both when they are available. If a provider is unavailable, the route can still show the exact local calculation and an offline status. I leave that status visible instead of filling the space with a plausible answer.

## What I still have to account for

I test with small, labeled fixtures. That gives me a known balance, a known sequence of transitions and a way to inspect evidence. It tells me nothing about how well a person repays debt, and it provides no latency or scale benchmark. The SQLite deployment is intended for a single local server process. I have not built payment rails, a bank integration or a production identity flow. The service can return an incomplete or misleading interpretation even when the underlying event is correct, so I inspect the evidence and keep the ledger calculation independently available.

The architectural payoff is practical. If I remove the provider from a request, the people in the demo can still agree to terms, record a promise, confirm a payment and calculate what remains. If I enable the provider, I can ask for context around those same records and inspect the sources of the explanation. I can compare the two experiences against one unchanged ledger instead of comparing two different sets of financial facts. That is the standard I use when deciding whether a remembered event belongs in PAKKA.

In the release exercise, I sent both requests through the application routes with different demo sessions. The first comparison recorded four successful retain acknowledgements, six recalled facts and four returned evidence items. In a separate provider trace, I checked that another authorized participant could query the shared bank without triggering another retain. I also compared the provider call count before and after a disabled request. It stayed the same. These checks give me concrete observations for the demonstration: a stored event changed its sync flag, a returned fact carried source metadata, and switching memory off did not change the repayment total.

I used the Hindsight project to understand retain, recall and reflect, and Vectorize's introduction to put the distinction between stored context and later synthesis into words. [Hindsight repository](https://github.com/vectorize-io/hindsight) · [Hindsight](https://hindsight.vectorize.io/) · [What is agent memory?](https://vectorize.io/what-is-agent-memory) · [PAKKA source](https://github.com/Joshua-Hebron-J/PAKKA)
