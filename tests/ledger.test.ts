import { describe, it, expect } from "vitest";
import {
  transition,
  balance,
  authorize,
  session,
  authenticate,
  type Debt,
} from "../lib/store";
function debt(): Debt {
  return {
    id: "test",
    title: "Test",
    lender: "asha",
    borrower: "rohan",
    status: "pending",
    terms: {
      principal: 10000,
      bps: 0,
      start: "2026-01-01",
      due: "2026-02-01",
      count: 1,
      note: "Test terms",
    },
    payments: [],
    events: [],
  };
}
describe("authorization and shared ledger", () => {
  it("authenticates real opaque sessions and rejects missing tokens", () => {
    expect(() => authenticate(undefined)).toThrow();
    const token = session("asha");
    expect(token.length).toBe(64);
    expect(authenticate(token)).toBe("asha");
    expect(() => authenticate("asha")).toThrow();
  });
  it("denies outsiders on reads and all transitions", () => {
    const d = debt();
    expect(() => authorize(d, "outsider")).toThrow();
    expect(() => transition(d, "outsider", "accept", {})).toThrow();
    expect(() => authorize(undefined, "asha")).toThrow();
  });
  it("only borrower accepts pending terms", () => {
    const d = debt();
    expect(() => transition(d, "asha", "accept", {})).toThrow();
    transition(d, "rohan", "accept", {});
    expect(d.status).toBe("accepted");
    expect(() => transition(d, "rohan", "accept", {})).toThrow();
  });
  it("only counterparty confirmation affects shared balance", () => {
    const d = debt();
    transition(d, "rohan", "accept", {});
    transition(d, "rohan", "payment", { amount: 3000 });
    expect(balance(d)).toBe(10000);
    const paymentId = d.payments[0].id;
    expect(() => transition(d, "rohan", "confirm", { paymentId })).toThrow();
    transition(d, "asha", "confirm", { paymentId });
    expect(balance(d)).toBe(7000);
    expect(() => transition(d, "asha", "dispute", { paymentId })).toThrow();
  });
  it("disputes leave balance untouched and pending totals prevent overpayment", () => {
    const d = debt();
    transition(d, "rohan", "accept", {});
    transition(d, "asha", "payment", { amount: 8000 });
    expect(() => transition(d, "rohan", "payment", { amount: 3000 })).toThrow();
    transition(d, "rohan", "dispute", { paymentId: d.payments[0].id });
    expect(balance(d)).toBe(10000);
    expect(() => transition(d, "asha", "payment", { amount: 10001 })).toThrow();
  });
  it("amendments require counterparty and preserve original until accepted", () => {
    const d = debt();
    transition(d, "rohan", "accept", {});
    transition(d, "asha", "amend", { terms: { ...d.terms, principal: 15000 } });
    expect(balance(d)).toBe(10000);
    expect(() => transition(d, "asha", "approve-amendment", {})).toThrow();
    transition(d, "rohan", "approve-amendment", {});
    expect(balance(d)).toBe(15000);
  });
  it("rejects payments before acceptance", () => {
    expect(() =>
      transition(debt(), "asha", "payment", { amount: 1 }),
    ).toThrow();
  });
  it("revalidates amendment totals after intervening repayments", () => {
    const d = debt();
    transition(d, "rohan", "accept", {});
    transition(d, "asha", "amend", { terms: { ...d.terms, principal: 5000 } });
    transition(d, "rohan", "payment", { amount: 8000 });
    expect(() => transition(d, "rohan", "approve-amendment", {})).toThrow(
      "pending payments",
    );
    transition(d, "asha", "confirm", { paymentId: d.payments[0].id });
    expect(() => transition(d, "rohan", "approve-amendment", {})).toThrow(
      "below confirmed",
    );
    expect(balance(d)).toBe(2000);
  });
});
