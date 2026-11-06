import type { Debt } from "./store";
import { money, total } from "./finance";
export type Affordability = { amount: number; date: string };
export function confirmedBalance(d: Debt) {
  return (
    total(d.terms.principal, d.terms.bps, d.terms.start, d.terms.due) -
    d.payments
      .filter((p) => p.status === "confirmed")
      .reduce((s, p) => s + p.amount, 0)
  );
}
export function repaymentSuggestion(
  d: Debt,
  affordability?: Affordability,
  today = new Date().toISOString().slice(0, 10),
) {
  const balance = confirmedBalance(d),
    reserved = d.payments
      .filter((p) => p.status === "pending")
      .reduce((s, p) => s + p.amount, 0),
    available = Math.max(0, balance - reserved);
  if (d.status !== "accepted")
    return {
      text: "Respond to the proposed terms before planning repayment.",
      amount: 0,
      date: null,
    };
  if (!balance)
    return {
      text: "The confirmed balance is settled. No further repayment is needed.",
      amount: 0,
      date: null,
    };
  if (!affordability)
    return {
      text: "Borrower: enter an amount you can afford and the date it will be available for a specific suggestion. No income is assumed.",
      amount: null,
      date: null,
    };
  const amount = Math.min(affordability.amount, available);
  if (!amount)
    return {
      text:
        reserved >= balance
          ? "Resolve pending payments before reporting another repayment."
          : "You entered ₹0.00 affordability. Discuss a manageable date with your counterparty; any change to agreed terms needs both approvals.",
      amount: 0,
      date: affordability.date,
    };
  const date = affordability.date;
  return {
    amount,
    date,
    text: `Consider ${money(amount)} on ${date}, within your stated affordability of ${money(affordability.amount)}. ${date > d.terms.due ? "This is after the agreed due date: discuss an amendment for bilateral approval." : d.terms.due < today ? "The agreement is overdue; check in with your counterparty." : `The agreed final due date remains ${d.terms.due}.`} ${amount < available ? `${money(available - amount)} would remain after this proposed payment is confirmed.` : "This could clear the available balance after confirmation."} Pending payments are reserved. This suggestion creates no payment, promise or amendment.`,
  };
}
export function politeReminder(d: Debt, lender: string, borrower: string) {
  const amount = confirmedBalance(d);
  if (d.status !== "accepted")
    return "This agreement is awaiting a decision. Please review the proposed terms when convenient.";
  if (amount === 0)
    return `Hi ${borrower}, our shared record for “${d.title}” shows a settled balance. Thank you! — ${lender}`;
  return `Hi ${borrower}, a gentle check-in about “${d.title}”: our shared record shows ${money(amount)} remaining, with an agreed final due date of ${d.terms.due}. Pending or disputed reports are not deducted. Please let me know a manageable next step. Thank you! — ${lender}`;
}
