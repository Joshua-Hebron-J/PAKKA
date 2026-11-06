import type { Debt } from "./store";
export type RepaymentPromise = {
  id: string;
  by: string;
  amount: number;
  date: string;
  note: string;
  createdAt: string;
  paymentIdsBefore: string[];
};
export type PromiseView = RepaymentPromise & {
  paid: number;
  remaining: number;
  status: "pending" | "fulfilled" | "overdue";
  paymentIds: string[];
};
/** Allocate each confirmed payment once, oldest eligible promise first. Earlier reports never fulfill a new promise. */
export function promiseStates(
  d: Debt,
  today = new Date().toISOString().slice(0, 10),
): PromiseView[] {
  const views = (d.promises || []).map((p) => ({
    ...p,
    paid: 0,
    remaining: p.amount,
    status: "pending" as PromiseView["status"],
    paymentIds: [] as string[],
  }));
  for (const payment of d.payments.filter((p) => p.status === "confirmed")) {
    let available = payment.amount;
    for (const p of views) {
      if (p.paymentIdsBefore.includes(payment.id) || !available || !p.remaining)
        continue;
      const used = Math.min(available, p.remaining);
      p.paid += used;
      p.remaining -= used;
      available -= used;
      p.paymentIds.push(payment.id);
    }
  }
  return views.map((p) => ({
    ...p,
    status:
      p.remaining === 0 ? "fulfilled" : p.date < today ? "overdue" : "pending",
  }));
}
