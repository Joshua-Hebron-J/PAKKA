import { describe, it, expect } from "vitest";
import { transition, balance, type Debt } from "../lib/store";
import { promiseStates } from "../lib/promises";
import { repaymentSuggestion, politeReminder } from "../lib/advice";
function debt(): Debt {
  return {
    id: "tools-test",
    title: "Test agreement",
    lender: "asha",
    borrower: "rohan",
    status: "accepted",
    terms: {
      principal: 10000,
      bps: 0,
      start: "2026-01-01",
      due: "2099-01-01",
      count: 1,
      note: "Original terms",
    },
    events: [],
    payments: [],
  };
}
const date = "2099-01-01";
describe("Promise tracker", () => {
  it("preserves old agreements without a promises field", () =>
    expect(promiseStates(debt())).toEqual([]));
  it("allows only an authorized borrower and validates exact amount/date", () => {
    for (const user of ["asha", "outsider"])
      expect(() =>
        transition(debt(), user, "promise", { amount: 100, date }),
      ).toThrow();
    for (const payload of [
      { amount: 1.2, date },
      { amount: 0, date },
      { amount: 1, date: "2020-01-01" },
      { amount: 1, date: "2099-02-30" },
    ])
      expect(() => transition(debt(), "rohan", "promise", payload)).toThrow();
  });
  it("persists intention separately and never changes financial terms or balance", () => {
    const d = debt(),
      terms = { ...d.terms };
    transition(d, "rohan", "promise", {
      amount: 3000,
      date,
      note: "After payday",
    });
    expect(balance(d)).toBe(10000);
    expect(d.terms).toEqual(terms);
    expect(d.events[0]).toMatchObject({
      kind: "promise-recorded",
      verified: false,
      memoryEligible: true,
    });
    expect(promiseStates(d)[0].status).toBe("pending");
  });
  it("only confirmed future-reported repayments fulfill a promise and append outcome once", () => {
    const d = debt();
    transition(d, "rohan", "payment", { amount: 1000 });
    transition(d, "rohan", "promise", { amount: 3000, date });
    transition(d, "asha", "confirm", { paymentId: d.payments[0].id });
    expect(promiseStates(d)[0].paid).toBe(0);
    transition(d, "rohan", "payment", { amount: 3000 });
    const id = d.payments.at(-1)!.id;
    expect(promiseStates(d)[0].status).toBe("pending");
    transition(d, "asha", "confirm", { paymentId: id });
    expect(promiseStates(d)[0]).toMatchObject({
      status: "fulfilled",
      paid: 3000,
      remaining: 0,
    });
    expect(d.events.filter((e) => e.kind === "promise-fulfilled")).toHaveLength(
      1,
    );
    expect(() => transition(d, "asha", "confirm", { paymentId: id })).toThrow();
    expect(d.events.filter((e) => e.kind === "promise-fulfilled")).toHaveLength(
      1,
    );
  });
  it("allocates confirmed paise once across promises and derives overdue from unpaid remainder", () => {
    const d = debt();
    transition(d, "rohan", "promise", { amount: 3000, date });
    transition(d, "rohan", "promise", { amount: 2000, date });
    transition(d, "rohan", "payment", { amount: 4000 });
    transition(d, "asha", "confirm", { paymentId: d.payments[0].id });
    const states = promiseStates(d, "2099-01-02");
    expect(states.map((p) => p.paid)).toEqual([3000, 1000]);
    expect(states.map((p) => p.status)).toEqual(["fulfilled", "overdue"]);
    expect(states.reduce((s, p) => s + p.paid, 0)).toBe(4000);
  });
  it("disputed repayments do not fulfill promises, and overcommitment is rejected", () => {
    const d = debt();
    transition(d, "rohan", "promise", { amount: 8000, date });
    expect(() =>
      transition(d, "rohan", "promise", { amount: 3000, date }),
    ).toThrow();
    transition(d, "rohan", "payment", { amount: 3000 });
    transition(d, "asha", "dispute", { paymentId: d.payments[0].id });
    expect(promiseStates(d)[0].paid).toBe(0);
  });
});
describe("Exact advisory suggestions and reminders", () => {
  it("never assumes affordability and accepts an explicitly zero amount", () => {
    const d = debt();
    expect(repaymentSuggestion(d).amount).toBeNull();
    expect(repaymentSuggestion(d, { amount: 0, date }).amount).toBe(0);
  });
  it("caps suggestion at affordability and balance less pending payments", () => {
    const d = debt();
    transition(d, "rohan", "payment", { amount: 2000 });
    expect(repaymentSuggestion(d, { amount: 9000, date }).amount).toBe(8000);
    expect(repaymentSuggestion(d, { amount: 1234, date }).amount).toBe(1234);
    expect(balance(d)).toBe(10000);
  });
  it("flags proposed dates after due as needing bilateral approval", () => {
    const d = debt();
    expect(
      repaymentSuggestion(d, { amount: 100, date: "2099-01-02" }).text,
    ).toContain("bilateral approval");
  });
  it("uses only confirmed balance and actual due date in reminders", () => {
    const d = debt();
    transition(d, "rohan", "payment", { amount: 2000 });
    const text = politeReminder(d, "Asha", "Rohan");
    expect(text).toContain("₹100.00");
    expect(text).toContain(d.terms.due);
    transition(d, "asha", "confirm", { paymentId: d.payments[0].id });
    expect(politeReminder(d, "Asha", "Rohan")).toContain("₹80.00");
  });
});
