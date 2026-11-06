import { describe, it, expect, vi, beforeEach } from "vitest";
const cookieMap = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) =>
      cookieMap.has(k) ? { value: cookieMap.get(k) } : undefined,
    set: (k: string, v: string) => cookieMap.set(k, v),
    delete: (k: string) => cookieMap.delete(k),
  }),
}));
import { POST } from "../app/api/action/route";
import { GET } from "../app/api/state/route";
import { POST as memory } from "../app/api/insights/route";
import { POST as reminder } from "../app/api/reminder/route";
import { session, read, save } from "../lib/store";
function req(p: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/action", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(p),
  });
}
beforeEach(() => cookieMap.clear());
describe("HTTP route authorization", () => {
  it("returns a truthful offline insight with the local ledger intact on provider failure", async () => {
    const d = read().find((d) => d.lender === "asha")!;
    cookieMap.set("pakka_session", session("rohan"));
    vi.stubEnv("HINDSIGHT_API_KEY", "test-only");
    vi.stubEnv("HINDSIGHT_BANK_PREFIX", "test-installation");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 503 })),
    );
    try {
      const r = await memory(
        req({
          id: d.id,
          enabled: true,
          affordability: { amount: 100, date: "2099-01-01" },
        }),
      );
      const data = await r.json();
      expect(r.status).toBe(200);
      expect(data.status).toBe("offline");
      expect(data.evidence).toEqual([]);
      expect(data.summary.balance).toBeGreaterThan(0);
      expect(data.suggestion.amount).toBe(100);
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
  it("protects promise mutations and reminder queries with membership", async () => {
    expect((await reminder(req({ id: "x" }))).status).toBe(400);
    cookieMap.set("pakka_session", session("asha"));
    expect(
      (
        await POST(
          req({
            action: "promise",
            id: "foreign",
            amount: 100,
            date: "2099-01-01",
          }),
        )
      ).status,
    ).toBe(400);
    expect((await reminder(req({ id: "unknown" }))).status).toBe(400);
    const d = read().find((d) => d.lender === "asha")!;
    expect((await reminder(req({ id: d.id }))).status).toBe(200);
    expect(
      (
        await POST(
          req({ action: "promise", id: d.id, amount: 100, date: "2099-01-01" }),
        )
      ).status,
    ).toBe(400);
  });
  it("validates affordability and only accepts it from the borrower", async () => {
    const d = read().find((d) => d.lender === "asha")!;
    cookieMap.set("pakka_session", session("asha"));
    expect(
      (
        await memory(
          req({
            id: d.id,
            enabled: false,
            affordability: { amount: 100, date: "2099-01-01" },
          }),
        )
      ).status,
    ).toBe(400);
    cookieMap.set("pakka_session", session("rohan"));
    for (const amount of [-1, 1.1])
      expect(
        (
          await memory(
            req({
              id: d.id,
              enabled: false,
              affordability: { amount, date: "2099-01-01" },
            }),
          )
        ).status,
      ).toBe(400);
    const r = await memory(
      req({
        id: d.id,
        enabled: false,
        affordability: { amount: 1234, date: "2099-01-01" },
      }),
    );
    expect(r.status).toBe(200);
    expect((await r.json()).suggestion.amount).toBe(1234);
  });
  it("accepts the actual loopback Host while rejecting unrelated origins", async () => {
    const request = new Request("http://localhost:3000/api/action", {
      method: "POST",
      headers: {
        host: "127.0.0.1:3000",
        origin: "http://127.0.0.1:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "signin", userId: "asha" }),
    });
    expect((await POST(request)).status).toBe(200);
  });
  it("rejects unauthenticated mutations and memory reads", async () => {
    expect((await POST(req({ action: "refresh" }))).status).toBe(400);
    expect((await memory(req({ id: "x", enabled: false }))).status).toBe(400);
    expect((await (await GET()).json()).userId).toBe(null);
  });
  it("creates server session and rejects cross-origin mutation", async () => {
    expect((await POST(req({ action: "signin", userId: "asha" }))).status).toBe(
      200,
    );
    expect(cookieMap.get("pakka_session")).toHaveLength(64);
    expect(
      (await POST(req({ action: "refresh" }, "https://attacker.example")))
        .status,
    ).toBe(400);
  });
  it("filters foreign agreements and blocks mutation and memory access", async () => {
    cookieMap.set("pakka_session", session("asha"));
    const data = read();
    const foreign = {
      ...data[0],
      id: "foreign",
      lender: "third-party",
      borrower: "fourth-party",
    };
    save([...data, foreign]);
    const state = await (await GET()).json();
    expect(state.debts.some((d: { id: string }) => d.id === "foreign")).toBe(
      false,
    );
    expect(
      (await POST(req({ action: "payment", id: "foreign", amount: 1 }))).status,
    ).toBe(400);
    expect((await memory(req({ id: "foreign", enabled: false }))).status).toBe(
      400,
    );
  });
  it("rejects malformed dates and amounts before mutation", async () => {
    cookieMap.set("pakka_session", session("asha"));
    expect(
      (
        await POST(
          req({
            action: "create",
            title: "Bad",
            terms: {
              principal: 1.1,
              bps: 0,
              start: "bad",
              due: "2026-01-01",
              count: 1,
              note: "bad",
            },
          }),
        )
      ).status,
    ).toBe(400);
  });
});
