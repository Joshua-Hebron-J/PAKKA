import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  transition,
  balance,
  read,
  save,
  session,
  type Debt,
} from "../lib/store";
import { total } from "../lib/finance";
import { insights } from "../lib/hindsight";
import { readPersonal, savePersonal } from "../lib/personal-store";
import { emptyPersonal } from "../lib/personal";
const cookies = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) =>
      cookies.has(k) ? { value: cookies.get(k) } : undefined,
  }),
}));
import { POST } from "../app/api/action/route";
import { GET } from "../app/api/state/route";
function fixture(): Debt {
  return {
    id: "amount-fixture",
    title: "Fictional amount fixture",
    lender: "asha",
    borrower: "rohan",
    status: "accepted",
    terms: {
      principal: 100000,
      bps: 0,
      start: "2026-01-01",
      due: "2027-01-01",
      count: 3,
      note: "Fictional test",
    },
    payments: [
      {
        id: "paid",
        amount: 25000,
        by: "rohan",
        status: "confirmed",
        date: "2026-02-01",
      },
    ],
    events: [],
  };
}
function propose(d: Debt, amount = 80000) {
  transition(d, "rohan", "request-amount-update", {
    amount,
    reason: " Correcting the fictional amount ",
  });
  return d.amendment!.amountUpdateId!;
}
function respond(
  d: Debt,
  id: string,
  action = "approve-amendment",
  user = "asha",
) {
  transition(d, user, action, { amendmentId: id });
}
function req(p: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(p),
  });
}
beforeEach(() => cookies.clear());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("borrower amount updates", () => {
  it("keeps all original terms and balances active while a request is pending", () => {
    const d = fixture(),
      terms = structuredClone(d.terms),
      payments = structuredClone(d.payments);
    propose(d);
    expect(d.terms).toEqual(terms);
    expect(d.payments).toEqual(payments);
    expect(balance(d)).toBe(75000);
    expect(d.amountUpdates?.[0]).toMatchObject({
      by: "rohan",
      oldAmount: 100000,
      proposedAmount: 80000,
      status: "pending",
      reason: "Correcting the fictional amount",
    });
    expect(d.events[0]).toMatchObject({
      kind: "amount-update-proposed",
      verified: false,
    });
  });
  it("requires the lender and exact current request, then preserves repayments exactly once", () => {
    const d = fixture(),
      id = propose(d),
      paid = structuredClone(d.payments);
    expect(() => respond(d, id, "approve-amendment", "rohan")).toThrow();
    expect(() => respond(d, id, "approve-amendment", "outsider")).toThrow();
    expect(() => transition(d, "asha", "approve-amendment", {})).toThrow();
    expect(() => respond(d, "wrong-id")).toThrow();
    respond(d, id);
    expect(d.terms.principal).toBe(80000);
    expect(balance(d)).toBe(55000);
    expect(d.payments).toEqual(paid);
    expect(d.amendment).toBeUndefined();
    expect(d.amountUpdates?.[0]).toMatchObject({
      status: "approved",
      resolvedBy: "asha",
    });
    expect(d.events.at(-1)).toMatchObject({
      kind: "amount-update-approved",
      verified: true,
    });
    expect(d.events.at(-1)?.synced).toBeUndefined();
    expect(() => respond(d, id)).toThrow();
    expect(
      d.events.filter((e) => e.kind === "amount-update-approved"),
    ).toHaveLength(1);
  });
  it("rejection leaves accounting intact and remains in history across a later proposal", () => {
    const d = fixture(),
      id = propose(d);
    respond(d, id, "reject-amendment");
    expect(balance(d)).toBe(75000);
    expect(d.terms.principal).toBe(100000);
    expect(d.amountUpdates?.[0].status).toBe("rejected");
    const newer = propose(d, 120000);
    expect(() => respond(d, id)).toThrow();
    expect(() => respond(d, id, "reject-amendment")).toThrow();
    expect(d.amendment?.amountUpdateId).toBe(newer);
    respond(d, newer);
    expect(balance(d)).toBe(95000);
    expect(d.amountUpdates?.map((r) => r.status)).toEqual([
      "rejected",
      "approved",
    ]);
  });
  it("blocks duplicate proposals and concurrent generic amendments", () => {
    const d = fixture();
    propose(d);
    expect(() => propose(d, 90000)).toThrow();
    expect(() =>
      transition(d, "asha", "amend", {
        terms: { ...d.terms, principal: 200000 },
      }),
    ).toThrow();
    expect(d.amountUpdates).toHaveLength(1);
  });
  it("does not allow stale amount responses to approve a newer generic amendment", () => {
    const d = fixture(),
      id = propose(d);
    respond(d, id, "reject-amendment");
    transition(d, "rohan", "amend", {
      terms: { ...d.terms, principal: 120000 },
    });
    expect(() => respond(d, id)).toThrow("no longer pending");
    expect(d.terms.principal).toBe(100000);
    transition(d, "asha", "approve-amendment", {});
    expect(d.terms.principal).toBe(120000);
  });
  it("only lets borrowers propose on accepted agreements", () => {
    for (const user of ["asha", "outsider"])
      expect(() =>
        transition(fixture(), user, "request-amount-update", {
          amount: 80000,
          reason: "Reason",
        }),
      ).toThrow();
    for (const status of ["pending", "rejected"] as const) {
      const d = fixture();
      d.status = status;
      expect(() => propose(d)).toThrow();
    }
  });
  it.each([0, -1, 1.1, 10000000001, 100000, 24999])(
    "rejects invalid or underpaid principal %s without mutation",
    (amount) => {
      const d = fixture(),
        original = structuredClone(d);
      expect(() => propose(d, amount)).toThrow();
      expect(d).toEqual(original);
    },
  );
  it("requires a nonblank bounded reason", () => {
    for (const reason of ["", "   ", "a".repeat(501)]) {
      const d = fixture();
      expect(() =>
        transition(d, "rohan", "request-amount-update", {
          amount: 80000,
          reason,
        }),
      ).toThrow();
      expect(d.amendment).toBeUndefined();
    }
  });
  it("supports exact full settlement at confirmed repayment amount", () => {
    const d = fixture(),
      id = propose(d, 25000);
    respond(d, id);
    expect(balance(d)).toBe(0);
    expect(d.payments[0].amount).toBe(25000);
  });
  it("preserves interest basis, dates, count and notes and calculates in integer paise", () => {
    const d = fixture();
    d.terms.bps = 1250;
    const old = { ...d.terms },
      id = propose(d, 80001);
    respond(d, id);
    expect(d.terms).toEqual({ ...old, principal: 80001 });
    expect(balance(d)).toBe(total(80001, 1250, old.start, old.due) - 25000);
    expect(Number.isSafeInteger(balance(d))).toBe(true);
  });
  it("rejects principal below confirmed repayments even when interest would cover them", () => {
    const d = fixture();
    d.terms.bps = 10000;
    expect(() => propose(d, 20000)).toThrow("below confirmed");
    expect(d.amendment).toBeUndefined();
  });
  it("cannot bypass the principal floor through the general amendment path", () => {
    const d = fixture();
    d.terms.bps = 10000;
    expect(() =>
      transition(d, "rohan", "amend", {
        terms: { ...d.terms, principal: 20000 },
      }),
    ).toThrow("below confirmed");
    transition(d, "rohan", "amend", {
      terms: { ...d.terms, principal: 30000 },
    });
    transition(d, "rohan", "payment", { amount: 10000 });
    transition(d, "asha", "confirm", { paymentId: d.payments.at(-1)!.id });
    expect(() => transition(d, "asha", "approve-amendment", {})).toThrow(
      "below confirmed",
    );
    expect(d.terms.principal).toBe(100000);
  });
  it("blocks proposal/approval with pending payments and rechecks intervening confirmations", () => {
    const d = fixture();
    transition(d, "rohan", "payment", { amount: 10000 });
    expect(() => propose(d)).toThrow("pending payments");
    transition(d, "asha", "dispute", { paymentId: d.payments.at(-1)!.id });
    const id = propose(d, 50000);
    transition(d, "rohan", "payment", { amount: 30000 });
    expect(() => respond(d, id)).toThrow("pending payments");
    transition(d, "asha", "confirm", { paymentId: d.payments.at(-1)!.id });
    expect(() => respond(d, id)).toThrow("below confirmed");
    expect(d.amountUpdates?.[0].status).toBe("pending");
    expect(balance(d)).toBe(45000);
    respond(d, id, "reject-amendment");
  });
  it("uses the existing durable outbox for approved facts only, with no re-retain on repeat", async () => {
    const d = fixture(),
      id = propose(d);
    respond(d, id);
    save([d]);
    vi.stubEnv("HINDSIGHT_API_KEY", "test-only");
    vi.stubEnv("HINDSIGHT_BANK_PREFIX", "test-installation");
    const f = vi.fn(async (url: string) =>
      Response.json(
        url.endsWith("/reflect")
          ? { text: "Test", based_on: { memories: [] } }
          : url.endsWith("/recall")
            ? { results: [] }
            : { success: true },
      ),
    );
    vi.stubGlobal("fetch", f);
    await insights(d, true);
    const calls = f.mock.calls as unknown as [string, RequestInit][];
    const retains = calls.filter(([u]) => u.endsWith("/memories"));
    expect(retains).toHaveLength(1);
    expect(JSON.parse(retains[0][1].body as string).items[0].content).toContain(
      "approved borrower amount update",
    );
    expect(JSON.parse(retains[0][1].body as string).items[0].document_id).toBe(
      d.events.at(-1)!.id,
    );
    const latest = read()[0];
    expect(latest.events.at(-1)?.synced).toBe(true);
    f.mockClear();
    await insights(latest, true);
    expect(f.mock.calls.filter(([u]) => u.endsWith("/memories"))).toHaveLength(
      0,
    );
  });
});
describe("amount request HTTP permissions and persistence", () => {
  it("round-trips both roles, denies injected changes and replay, and leaves Money Manager untouched", async () => {
    save([fixture()]);
    const personal = emptyPersonal();
    savePersonal("rohan", personal);
    expect(
      (
        await POST(
          req({
            action: "request-amount-update",
            id: "amount-fixture",
            amount: 80000,
            reason: "Test",
          }),
        )
      ).status,
    ).toBe(400);
    cookies.set("pakka_session", session("asha"));
    expect(
      (
        await POST(
          req({
            action: "request-amount-update",
            id: "amount-fixture",
            amount: 80000,
            reason: "Test",
          }),
        )
      ).status,
    ).toBe(400);
    cookies.set("pakka_session", session("rohan"));
    expect(
      (
        await POST(
          req(
            {
              action: "request-amount-update",
              id: "amount-fixture",
              amount: 80000,
              reason: "Test",
            },
            "https://foreign.example",
          ),
        )
      ).status,
    ).toBe(400);
    const r = await POST(
      req({
        action: "request-amount-update",
        id: "amount-fixture",
        amount: 80000,
        reason: "Test",
        terms: { ...fixture().terms, bps: 9999 },
      }),
    );
    expect(r.status).toBe(200);
    const id = read()[0].amendment!.amountUpdateId!;
    expect(read()[0].amendment!.terms.bps).toBe(0);
    expect(
      (
        await POST(
          req({
            action: "approve-amendment",
            id: "amount-fixture",
            amendmentId: id,
          }),
        )
      ).status,
    ).toBe(400);
    cookies.set("pakka_session", session("asha"));
    const state = await (await GET()).json();
    expect(state.debts[0].amountUpdates[0].status).toBe("pending");
    expect(state.debts[0].balance).toBe(75000);
    expect(
      (
        await POST(
          req({
            action: "approve-amendment",
            id: "amount-fixture",
            amendmentId: id,
          }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await POST(
          req({
            action: "approve-amendment",
            id: "amount-fixture",
            amendmentId: id,
          }),
        )
      ).status,
    ).toBe(400);
    expect(balance(read()[0])).toBe(55000);
    expect(readPersonal("rohan")).toEqual(personal);
  });
  it("rejects invalid request inputs and unknown agreement access", async () => {
    cookies.set("pakka_session", session("rohan"));
    for (const patch of [
      { amount: 1.5 },
      { amount: 0 },
      { reason: " " },
      { reason: "a".repeat(501) },
    ])
      expect(
        (
          await POST(
            req({
              action: "request-amount-update",
              id: "amount-fixture",
              amount: 80000,
              reason: "Test",
              ...patch,
            }),
          )
        ).status,
      ).toBe(400);
    expect(
      (
        await POST(
          req({
            action: "request-amount-update",
            id: "foreign",
            amount: 80000,
            reason: "Test",
          }),
        )
      ).status,
    ).toBe(400);
  });
});
