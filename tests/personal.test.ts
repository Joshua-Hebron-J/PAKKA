import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  emptyPersonal,
  monthlySummary,
  personalActionSchema,
} from "../lib/personal";
import {
  mutatePersonal,
  readPersonal,
  savePersonal,
  personalView,
} from "../lib/personal-store";
import { personalCoach, personalBank } from "../lib/personal-memory";
const cookies = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) =>
      cookies.has(k) ? { value: cookies.get(k) } : undefined,
  }),
}));
import { GET, POST } from "../app/api/personal/route";
import { POST as coachRoute } from "../app/api/personal/coach/route";
import { session, read } from "../lib/store";
const date = "2026-01-05",
  month = "2026-01";
function action(user: string, p: unknown) {
  return mutatePersonal(user, personalActionSchema.parse(p));
}
function entry(
  type: "income" | "expense" = "income",
  amount = 10001,
  category = type === "income" ? "Salary" : "Food",
) {
  return {
    action: "transaction-save",
    type,
    amount,
    category,
    date,
    note: "confirmed test",
    confirmed: true,
  };
}
function req(p: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/personal", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
}
beforeEach(() => {
  savePersonal("asha", emptyPersonal());
  savePersonal("rohan", emptyPersonal());
  cookies.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("private exact financial ledger", () => {
  it("keeps paise exact, rounds basis points deterministically and separates months", () => {
    action("asha", entry("income", 10001));
    action("asha", entry("expense", 3333));
    action("asha", { ...entry("expense", 100), date: "2025-12-01" });
    const s = monthlySummary(readPersonal("asha"), month);
    expect(s).toMatchObject({
      income: 10001,
      expenses: 3333,
      net: 6668,
      savingsRateBps: 6667,
      entryCount: 2,
      starterSaving: 1000,
    });
    expect(s.categories.find((c) => c.category === "Food")?.amount).toBe(3333);
  });
  it("handles zero income and negative cash flow without invented affordability", () => {
    action("asha", entry("expense", 500));
    expect(monthlySummary(readPersonal("asha"), month)).toMatchObject({
      income: 0,
      net: -500,
      savingsRateBps: null,
      starterSaving: 0,
    });
    action("asha", entry("income", 100));
    expect(monthlySummary(readPersonal("asha"), month).savingsRateBps).toBe(
      -40000,
    );
  });
  it("excludes shared repayments completely and counts a manually entered expense only once", () => {
    expect(read().length).toBeGreaterThan(0);
    expect(monthlySummary(readPersonal("asha"), month).expenses).toBe(0);
    action("asha", entry("expense", 101, "Debt repayment"));
    expect(monthlySummary(readPersonal("asha"), month).expenses).toBe(101);
  });
  it("recalculates after edits and deletes while preserving fictional flags", () => {
    const d = action("asha", entry());
    action("asha", {
      ...entry("expense", 199, "Health"),
      id: d.transactions[0].id,
    });
    expect(monthlySummary(readPersonal("asha"), month)).toMatchObject({
      income: 0,
      expenses: 199,
    });
    action("asha", { action: "transaction-delete", id: d.transactions[0].id });
    expect(readPersonal("asha").transactions).toEqual([]);
    expect(readPersonal("asha").revision).toBe(3);
  });
  it("isolates both reads and foreign transaction mutations", () => {
    const d = action("asha", entry());
    expect(readPersonal("rohan").transactions).toEqual([]);
    expect(() =>
      action("rohan", { ...entry(), id: d.transactions[0].id }),
    ).toThrow("not available");
    expect(() =>
      action("rohan", {
        action: "transaction-delete",
        id: d.transactions[0].id,
      }),
    ).toThrow();
    expect(readPersonal("asha").transactions).toHaveLength(1);
  });
  it("never seeds implicitly and labels all opt-in demo records", () => {
    expect(readPersonal("rohan").revision).toBe(0);
    const d = action("rohan", { action: "load-demo", confirmed: true });
    expect(d.transactions).toHaveLength(18);
    expect(d.transactions.every((t) => t.fictional && t.confirmed)).toBe(true);
    expect(d.budgets.every((b) => b.fictional)).toBe(true);
    expect(() =>
      action("rohan", { action: "load-demo", confirmed: true }),
    ).toThrow("empty");
    action("rohan", { ...entry(), id: d.transactions[0].id });
    expect(readPersonal("rohan").transactions[0].fictional).toBe(true);
  });
  it.each([
    { amount: 1.5 },
    { amount: -1 },
    { amount: 0 },
    { confirmed: false },
    { date: "2099-01-01" },
    { date: "2026-02-30" },
    { category: "Food" },
    { userId: "rohan" },
    { fictional: true },
  ])("rejects invalid entry fields %j", (patch) => {
    expect(() => action("asha", { ...entry(), ...patch })).toThrow();
  });
  it("rejects invalid month and unknown owners", () => {
    expect(() => monthlySummary(emptyPersonal(), "2026-13")).toThrow();
    expect(() => readPersonal("foreign")).toThrow();
  });
  it("tracks goal allocations independently, with target and ownership guards", () => {
    action("asha", entry("income", 10000));
    const d = action("asha", {
        action: "goal-save",
        name: "Emergency",
        target: 10000,
        due: "",
      }),
      id = d.goals[0].id;
    action("asha", {
      action: "contribution-add",
      goalId: id,
      amount: 9500,
      date,
      note: "allocation",
      confirmed: true,
    });
    const s = monthlySummary(readPersonal("asha"), month);
    expect(s).toMatchObject({
      income: 10000,
      expenses: 0,
      net: 10000,
      allocations: 9500,
      starterSaving: 500,
    });
    expect(s.goals[0].contributed).toBe(9500);
    expect(() =>
      action("rohan", {
        action: "contribution-add",
        goalId: id,
        amount: 1,
        date,
        note: "",
        confirmed: true,
      }),
    ).toThrow();
    expect(() =>
      action("asha", {
        action: "contribution-add",
        goalId: id,
        amount: 501,
        date,
        note: "",
        confirmed: true,
      }),
    ).toThrow();
    expect(() =>
      action("asha", {
        action: "goal-save",
        id,
        name: "Emergency",
        target: 9000,
        due: "",
      }),
    ).toThrow();
    const c = readPersonal("asha").goals[0].contributions[0];
    action("asha", { action: "contribution-delete", goalId: id, id: c.id });
    action("asha", {
      action: "goal-save",
      id,
      name: "Updated",
      target: 12000,
      due: "2027-01-01",
    });
    expect(readPersonal("asha").goals[0].name).toBe("Updated");
    action("asha", { action: "goal-delete", id });
    expect(readPersonal("asha").goals).toEqual([]);
  });
  it("upserts one monthly category budget and measures only matching expenses", () => {
    action("asha", entry("expense", 200));
    action("asha", entry("expense", 300, "Housing"));
    action("asha", {
      action: "budget-save",
      category: "Food",
      month,
      limit: 100,
    });
    const d = action("asha", {
      action: "budget-save",
      category: "Food",
      month,
      limit: 0,
    });
    expect(d.budgets).toHaveLength(1);
    expect(monthlySummary(d, month).budgets[0]).toMatchObject({
      limit: 0,
      spent: 200,
    });
    expect(monthlySummary(d, "2026-02").budgets).toEqual([]);
    expect(() =>
      action("rohan", { action: "budget-delete", id: d.budgets[0].id }),
    ).toThrow();
    action("asha", { action: "budget-delete", id: d.budgets[0].id });
    expect(readPersonal("asha").budgets).toEqual([]);
  });
});
describe("personal route privacy", () => {
  it("requires a genuine session, rejects cross-origin writes and owner injection", async () => {
    expect(
      (
        await GET(
          new Request(`http://localhost:3000/api/personal?month=${month}`),
        )
      ).status,
    ).toBe(400);
    expect((await POST(req(entry()))).status).toBe(400);
    cookies.set("pakka_session", session("asha"));
    expect((await POST(req(entry(), "https://foreign.example"))).status).toBe(
      400,
    );
    expect((await POST(req({ ...entry(), userId: "rohan" }))).status).toBe(400);
    expect((await POST(req(entry()))).status).toBe(200);
    cookies.set("pakka_session", session("rohan"));
    const r = await GET(
      new Request(`http://localhost:3000/api/personal?month=${month}`),
    );
    expect((await r.json()).ledger.transactions).toEqual([]);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
  });
  it("rejects coach calls lacking explicit consent before any provider request", async () => {
    cookies.set("pakka_session", session("asha"));
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(
      (await coachRoute(req({ month, enabled: true, syncConfirmed: false })))
        .status,
    ).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });
});
describe("personal Hindsight boundary", () => {
  function configured() {
    vi.stubEnv("HINDSIGHT_API_KEY", "test-secret-not-real");
    vi.stubEnv("HINDSIGHT_BANK_PREFIX", "test-installation");
  }
  function provider() {
    return vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.endsWith("/reflect")
              ? {
                  text: "Insufficient comparable full months.",
                  based_on: {
                    memories: [{ id: "fact-1", text: "Recorded test income" }],
                  },
                }
              : url.endsWith("/recall")
                ? { results: [{ id: "fact-1", text: "Recorded test income" }] }
                : { success: true },
          ),
        ),
    );
  }
  it("OFF is entirely local even with a configured provider", async () => {
    configured();
    const f = provider();
    vi.stubGlobal("fetch", f);
    const r = await personalCoach("asha", month, false, false);
    expect(r.status).toBe("disabled");
    expect(r.evidence).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });
  it("has structurally separate user banks and never exposes bank metadata in ledger views", () => {
    configured();
    expect(personalBank("asha")).not.toBe(personalBank("rohan"));
    expect(personalBank("asha")).toContain("-personal-");
    const d = emptyPersonal();
    d.memorySync = { revision: 0, at: date, bank: "private-bank" };
    expect(personalView(d).memorySync).not.toHaveProperty("bank");
  });
  it("retains replacement snapshots then recalls and reflects, deduplicating cited evidence", async () => {
    configured();
    action("asha", entry());
    const f = provider();
    vi.stubGlobal("fetch", f);
    const r = await personalCoach("asha", month, true, true);
    expect(r.status).toBe("connected");
    expect(f).toHaveBeenCalledTimes(3);
    const body = JSON.parse(
      (f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body.items[0]).toMatchObject({
      document_id: "personal-ledger-current",
      update_mode: "replace",
    });
    expect(body.items[0].content).not.toContain("Agreement");
    expect(body.items[0].content).toContain("₹100.01 INR");
    expect(body.items[0].content).toContain("Source transaction");
    expect(r.evidence).toHaveLength(1);
    expect(readPersonal("asha").memorySync?.revision).toBe(1);
    expect((r as Record<string, unknown>).bank).toBeUndefined();
  });
  it("replaces deleted records on the next explicit sync instead of retaining stale entries", async () => {
    configured();
    const d = action("asha", entry());
    const f = provider();
    vi.stubGlobal("fetch", f);
    await personalCoach("asha", month, true, true);
    action("asha", { action: "transaction-delete", id: d.transactions[0].id });
    await personalCoach("asha", month, true, true);
    const body = JSON.parse(
      (f.mock.calls[3] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body.items[0].content).not.toContain(d.transactions[0].id);
    expect(body.items[0].update_mode).toBe("replace");
  });
  it("refuses stale guidance if ledger changes during provider work without losing the change", async () => {
    configured();
    action("asha", entry());
    const f = vi.fn(async () => {
      action("asha", entry("expense", 5));
      return new Response("{}");
    });
    vi.stubGlobal("fetch", f);
    await expect(personalCoach("asha", month, true, true)).rejects.toThrow(
      "Ledger changed",
    );
    expect(readPersonal("asha").transactions).toHaveLength(2);
    expect(readPersonal("asha").revision).toBe(2);
  });
  it("provides sanitized offline output on malformed or failed provider responses", async () => {
    configured();
    cookies.set("pakka_session", session("asha"));
    action("asha", entry());
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response("private-provider-error", { status: 503 }),
      ),
    );
    const r = await coachRoute(
      req({ month, enabled: true, syncConfirmed: true }),
    );
    const body = await r.json();
    expect(body.status).toBe("offline");
    expect(body.summary.income).toBe(10001);
    expect(body.evidence).toEqual([]);
    expect(JSON.stringify(body)).not.toContain("test-secret");
    expect(JSON.stringify(body)).not.toContain("private-provider-error");
  });
  it("does not call the provider for a never-synced empty ledger", async () => {
    configured();
    const f = provider();
    vi.stubGlobal("fetch", f);
    expect((await personalCoach("asha", month, true, true)).status).toBe(
      "no-records",
    );
    expect(f).not.toHaveBeenCalled();
  });
  it("validates successful HTTP responses instead of displaying malformed memories", async () => {
    configured();
    cookies.set("pakka_session", session("asha"));
    action("asha", entry());
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}")),
    );
    const r = await coachRoute(
      req({ month, enabled: true, syncConfirmed: true }),
    );
    expect((await r.json()).status).toBe("offline");
  });
  it("does not accept an owner query or disclose another personal ledger", async () => {
    cookies.set("pakka_session", session("rohan"));
    action("asha", entry());
    expect(
      (
        await GET(
          new Request(
            `http://localhost:3000/api/personal?month=${month}&userId=asha`,
          ),
        )
      ).status,
    ).toBe(400);
  });
  it("reports missing configuration without inventing memory", async () => {
    vi.stubEnv("HINDSIGHT_API_KEY", "");
    const f = provider();
    vi.stubGlobal("fetch", f);
    expect((await personalCoach("asha", month, true, true)).status).toBe(
      "not-connected",
    );
    expect(f).not.toHaveBeenCalled();
  });
});
