import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { total, reminder, money } from "./finance";
import { promiseStates, type RepaymentPromise } from "./promises";
let connection: DatabaseSync | undefined;

function database() {
  if (connection) return connection;
  mkdirSync("data", { recursive: true });
  const db = new DatabaseSync(
    process.env.PAKKA_DB_PATH || "data/pakka.sqlite",
    { timeout: 5000 },
  );
  db.exec(
    `PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS store (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,userId TEXT NOT NULL,expires INTEGER NOT NULL);`,
  );
  connection = db;
  return db;
}
export type Terms = {
  principal: number;
  bps: number;
  start: string;
  due: string;
  count: number;
  note: string;
};
export type Payment = {
  id: string;
  amount: number;
  by: string;
  status: "pending" | "confirmed" | "disputed";
  date: string;
};
export type Event = {
  id: string;
  kind: string;
  text: string;
  at: string;
  verified: boolean;
  synced?: boolean;
  memoryEligible?: boolean;
  promiseId?: string;
};
export type AmountUpdate = {
  id: string;
  by: string;
  oldAmount: number;
  proposedAmount: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  proposedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
};
export type Debt = {
  id: string;
  title: string;
  lender: string;
  borrower: string;
  status: "pending" | "accepted" | "rejected";
  terms: Terms;
  payments: Payment[];
  events: Event[];
  promises?: RepaymentPromise[];
  amendment?: { by: string; terms: Terms; amountUpdateId?: string };
  amountUpdates?: AmountUpdate[];
  alert?: string | null;
};
export const users = [
  {
    id: "asha",
    name: "Asha Sharma",
    initials: "AS",
    role: "Designer · Bengaluru",
  },
  {
    id: "rohan",
    name: "Rohan Mehta",
    initials: "RM",
    role: "Engineer · Bengaluru",
  },
];
function event(d: Debt, kind: string, text: string, verified = true) {
  d.events.push({
    id: randomUUID(),
    kind,
    text,
    verified,
    at: new Date().toISOString(),
  });
}
function seed(): Debt[] {
  const today = new Date();
  const date = (days: number) =>
    new Date(today.getTime() + days * 86400000).toISOString().slice(0, 10);
  return [
    {
      id: randomUUID(),
      title: "A little help for the big move",
      lender: "asha",
      borrower: "rohan",
      status: "accepted",
      terms: {
        principal: 2500000,
        bps: 0,
        start: date(-30),
        due: date(5),
        count: 3,
        note: "Moving deposit. Three equal installments; no interest.",
      },
      payments: [
        {
          id: randomUUID(),
          amount: 500000,
          by: "rohan",
          status: "confirmed",
          date: date(-10),
        },
      ],
      events: [
        {
          id: randomUUID(),
          kind: "accepted",
          text: "Both parties accepted ₹25,000, no interest, for the moving deposit.",
          at: new Date(today.getTime() - 30 * 86400000).toISOString(),
          verified: true,
        },
        {
          id: randomUUID(),
          kind: "confirmed",
          text: "Both parties confirmed ₹5,000 repayment toward the moving deposit.",
          at: new Date(today.getTime() - 10 * 86400000).toISOString(),
          verified: true,
        },
      ],
    },
    {
      id: randomUUID(),
      title: "Weekend getaway",
      lender: "rohan",
      borrower: "asha",
      status: "accepted",
      terms: {
        principal: 680000,
        bps: 0,
        start: date(-20),
        due: date(-3),
        count: 1,
        note: "Shared travel booking. Repay after payday.",
      },
      payments: [],
      events: [
        {
          id: randomUUID(),
          kind: "accepted",
          text: "Both parties accepted ₹6,800 shared travel booking, no interest.",
          at: date(-20) + "T10:00:00Z",
          verified: true,
        },
      ],
    },
  ];
}
export function read(): Debt[] {
  const row = database().prepare("SELECT value FROM store WHERE id=1").get() as
    { value: string } | undefined;
  if (row) return JSON.parse(row.value);
  const data = seed();
  save(data);
  return data;
}
export function save(data: Debt[]) {
  database()
    .prepare(
      "INSERT INTO store(id,value) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value",
    )
    .run(JSON.stringify(data));
}
export function session(userId: string) {
  if (!users.some((u) => u.id === userId)) throw Error("Unknown demo user");
  const token = randomBytes(32).toString("hex");
  database()
    .prepare("INSERT INTO sessions VALUES(?,?,?)")
    .run(token, userId, Date.now() + 86400000);
  return token;
}
export function authenticate(token: string | undefined) {
  const row = token
    ? (database()
        .prepare("SELECT userId FROM sessions WHERE token=? AND expires>?")
        .get(token, Date.now()) as { userId: string } | undefined)
    : undefined;
  if (!row) throw Error("Sign in to continue");
  return row.userId;
}
export function logout(token: string) {
  database().prepare("DELETE FROM sessions WHERE token=?").run(token);
}
export function authorize(
  d: Debt | undefined,
  user: string,
): asserts d is Debt {
  if (!d || ![d.lender, d.borrower].includes(user))
    throw Error("Agreement not available");
}
function confirmedPaid(d: Debt) {
  return d.payments
    .filter((p) => p.status === "confirmed")
    .reduce((sum, p) => sum + p.amount, 0);
}
export function balance(d: Debt) {
  return (
    total(d.terms.principal, d.terms.bps, d.terms.start, d.terms.due) -
    d.payments
      .filter((p) => p.status === "confirmed")
      .reduce((s, p) => s + p.amount, 0)
  );
}
export function transition(
  d: Debt,
  user: string,
  action: string,
  payload: {
    amount?: number;
    paymentId?: string;
    amendmentId?: string;
    reason?: string;
    terms?: Terms;
    date?: string;
    note?: string;
  },
) {
  authorize(d, user);
  if (action === "accept" || action === "reject") {
    if (d.status !== "pending" || user !== d.borrower)
      throw Error("Only borrower can respond to a pending agreement");
    d.status = action === "accept" ? "accepted" : "rejected";
    event(
      d,
      d.status,
      `${user} ${d.status} the agreement: ${JSON.stringify(d.terms)}`,
      action === "accept",
    );
    return;
  }
  if (d.status !== "accepted") throw Error("Agreement must be accepted");
  if (action === "promise") {
    if (user !== d.borrower)
      throw Error("Only the borrower can record a promise");
    const amount = payload.amount || 0,
      date = payload.date || "",
      today = new Date().toISOString().slice(0, 10);
    if (
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date ||
      date < today
    )
      throw Error(
        "Enter a positive exact amount and a valid date today or later",
      );
    if ((payload.note || "").length > 500)
      throw Error("Promise note is too long");
    const committed =
      promiseStates(d).reduce((sum, p) => sum + p.remaining, 0) +
      d.payments
        .filter((p) => p.status === "pending")
        .reduce((sum, p) => sum + p.amount, 0);
    if (amount > balance(d) - committed)
      throw Error(
        "Promise exceeds the balance available after existing promises and pending payments",
      );
    const p: RepaymentPromise = {
      id: randomUUID(),
      by: user,
      amount,
      date,
      note: payload.note || "",
      createdAt: new Date().toISOString(),
      paymentIdsBefore: d.payments.map((p) => p.id),
    };
    (d.promises ??= []).push(p);
    event(
      d,
      "promise-recorded",
      `${user} recorded an intention to repay ${amount} paise on ${date}. Note: ${p.note || "None"}. This is a borrower intention, NOT a confirmed payment or amended contractual term.`,
      false,
    );
    Object.assign(d.events[d.events.length - 1], {
      memoryEligible: true,
      promiseId: p.id,
    });
    return;
  }
  if (action === "payment") {
    const amount = payload.amount || 0;
    const reserved = d.payments
      .filter((p) => p.status === "pending")
      .reduce((s, p) => s + p.amount, 0);
    if (
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      amount > balance(d) - reserved
    )
      throw Error(
        "Payment exceeds available balance (including pending payments)",
      );
    const p: Payment = {
      id: randomUUID(),
      amount,
      by: user,
      status: "pending",
      date: new Date().toISOString().slice(0, 10),
    };
    d.payments.push(p);
    event(
      d,
      "reported",
      `${user} reported ${amount} paise; awaiting acknowledgment`,
      false,
    );
  } else if (action === "confirm" || action === "dispute") {
    const p = d.payments.find((p) => p.id === payload.paymentId);
    if (!p || p.status !== "pending" || p.by === user)
      throw Error("Only the counterparty can resolve a pending payment");
    p.status = action === "confirm" ? "confirmed" : "disputed";
    event(
      d,
      p.status,
      `${user} ${p.status} payment ${p.id} for ${p.amount} paise, reported by ${p.by}.`,
      action === "confirm",
    );
    if (action === "confirm")
      for (const promise of promiseStates(d).filter(
        (p) => p.status === "fulfilled",
      )) {
        if (
          d.events.some(
            (e) => e.kind === "promise-fulfilled" && e.promiseId === promise.id,
          )
        )
          continue;
        event(
          d,
          "promise-fulfilled",
          `Promise ${promise.id} for ${promise.amount} paise is fulfilled by confirmed repayments ${promise.paymentIds.join(", ")}. It is not an additional payment.`,
        );
        d.events[d.events.length - 1].promiseId = promise.id;
      }
  } else if (action === "amend" || action === "request-amount-update") {
    const amountOnly = action === "request-amount-update";
    if (amountOnly) {
      if (user !== d.borrower)
        throw Error("Only the borrower can request an amount update");
      if (
        !Number.isSafeInteger(payload.amount) ||
        !payload.amount ||
        payload.amount < 1 ||
        payload.amount > 10000000000 ||
        payload.amount === d.terms.principal
      )
        throw Error(
          "Enter a different positive exact agreement amount up to ₹10 crore",
        );
      if (!payload.reason?.trim() || payload.reason.trim().length > 500)
        throw Error("Provide an amount update reason (1–500 characters)");
      payload = {
        ...payload,
        terms: { ...d.terms, principal: payload.amount },
      };
    }
    if (
      d.amendment ||
      !payload.terms ||
      d.payments.some((p) => p.status === "pending")
    )
      throw Error("Resolve pending payments or existing amendment first");
    if (
      total(
        payload.terms.principal,
        payload.terms.bps,
        payload.terms.start,
        payload.terms.due,
      ) <
      d.payments
        .filter((p) => p.status === "confirmed")
        .reduce((s, p) => s + p.amount, 0)
    )
      throw Error("New total cannot be below confirmed repayments");
    if (payload.terms.principal < confirmedPaid(d))
      throw Error("Updated amount cannot be below confirmed repayments");
    d.amendment = { by: user, terms: { ...payload.terms } };
    if (amountOnly) {
      const request: AmountUpdate = {
        id: randomUUID(),
        by: user,
        oldAmount: d.terms.principal,
        proposedAmount: payload.terms.principal,
        reason: payload.reason!.trim(),
        status: "pending",
        proposedAt: new Date().toISOString(),
      };
      (d.amountUpdates ??= []).push(request);
      d.amendment.amountUpdateId = request.id;
      event(
        d,
        "amount-update-proposed",
        `Borrower ${user} proposed amount update ${request.id}: original principal ${money(request.oldAmount)}, proposed principal ${money(request.proposedAmount)}. Reason: ${request.reason}. Pending lender approval; original terms and balance remain active.`,
        false,
      );
      return;
    }
    event(
      d,
      "amendment",
      "Amendment proposed; original terms remain active",
      false,
    );
  } else if (action === "approve-amendment" || action === "reject-amendment") {
    if (!d.amendment || d.amendment.by === user)
      throw Error("Counterparty approval required");
    const requestId = d.amendment.amountUpdateId;
    const request = requestId
      ? d.amountUpdates?.find(
          (r) => r.id === requestId && r.status === "pending",
        )
      : undefined;
    if (
      requestId &&
      (!request || user !== d.lender || payload.amendmentId !== requestId)
    )
      throw Error("Lender must respond to the current pending amount request");
    // A stale response for a resolved amount request must never approve a different amendment.
    if (!requestId && payload.amendmentId)
      throw Error("Amount request is no longer pending");
    if (action === "approve-amendment") {
      if (
        request &&
        (d.amendment.terms.principal !== request.proposedAmount ||
          request.oldAmount !== d.terms.principal ||
          request.proposedAmount < confirmedPaid(d))
      )
        throw Error(
          "Updated amount is below confirmed repayments or the request is stale",
        );
      if (d.amendment.terms.principal < confirmedPaid(d))
        throw Error("Amended principal is below confirmed repayments");
      if (d.payments.some((p) => p.status === "pending"))
        throw Error("Resolve pending payments before approving an amendment");
      if (
        total(
          d.amendment.terms.principal,
          d.amendment.terms.bps,
          d.amendment.terms.start,
          d.amendment.terms.due,
        ) <
        d.payments
          .filter((p) => p.status === "confirmed")
          .reduce((s, p) => s + p.amount, 0)
      )
        throw Error("Amended total is below confirmed repayments");
      d.terms = { ...d.amendment.terms };
      if (request) {
        request.status = "approved";
        request.resolvedAt = new Date().toISOString();
        request.resolvedBy = user;
        event(
          d,
          "amount-update-approved",
          `Lender ${user} approved borrower amount update ${request.id}: principal changed from ${money(request.oldAmount)} to ${money(request.proposedAmount)}. Reason: ${request.reason}. Confirmed repayments ${money(confirmedPaid(d))} preserved. New agreed total ${money(total(d.terms.principal, d.terms.bps, d.terms.start, d.terms.due))}; outstanding balance ${money(balance(d))}. Rate, dates and installment count unchanged.`,
        );
      }
      if (!request)
        event(
          d,
          "amended",
          `Both parties approved amended terms: ${JSON.stringify(d.terms)}`,
        );
    } else if (request) {
      request.status = "rejected";
      request.resolvedAt = new Date().toISOString();
      request.resolvedBy = user;
      event(
        d,
        "amount-update-rejected",
        `Lender ${user} rejected borrower amount update ${request.id}: original principal ${money(request.oldAmount)}, proposed principal ${money(request.proposedAmount)}. Reason: ${request.reason}. Original terms and confirmed repayments unchanged.`,
        false,
      );
    } else event(d, "amendment-rejected", "Amendment rejected", false);
    delete d.amendment;
  } else throw Error("Unknown action");
}
export function refresh(data: Debt[]) {
  for (const d of data)
    d.alert =
      d.status === "accepted" ? reminder(d.terms.due, balance(d)) : null;
}
