import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { insights } from "../lib/hindsight";
import { read, save } from "../lib/store";
import { transition } from "../lib/store";
const originalData = read();
beforeEach(() => save(structuredClone(originalData)));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("Hindsight adapter contract (mock transport, NOT live service proof)", () => {
  it("retains labeled promise intentions without treating them as verified payments, and never retains affordability", async () => {
    vi.stubEnv("HINDSIGHT_API_KEY", "test-only");
    vi.stubEnv("HINDSIGHT_BANK_PREFIX", "test-installation");
    const all = read(),
      d = all[0];
    d.events.forEach((e) => (e.synced = true));
    transition(d, d.borrower, "promise", {
      amount: 100,
      date: "2099-01-01",
      note: "Intent only",
    });
    save(all);
    const f = vi.fn(async (url: string) =>
      Response.json(
        url.endsWith("/reflect")
          ? { text: "No invented history", based_on: { memories: [] } }
          : url.endsWith("/recall")
            ? { results: [] }
            : { success: true },
      ),
    );
    vi.stubGlobal("fetch", f);
    await insights(d, true, { amount: 4321, date: "2099-01-01" });
    const calls = f.mock.calls as unknown as [string, RequestInit][];
    const retain = JSON.parse(
      calls.find(([u]) => u.endsWith("/memories"))![1].body as string,
    );
    expect(retain.items[0].content).toContain("not a verified repayment");
    expect(retain.items[0].content).not.toContain("43.21");
    const reflect = JSON.parse(calls.at(-1)![1].body as string);
    expect(reflect.query).toContain("₹43.21");
    expect(reflect.query).toContain("not verified income");
  });
  it("makes no calls when disabled or missing credentials", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    vi.stubEnv("HINDSIGHT_API_KEY", "");
    const d = read()[0];
    expect((await insights(d, false)).status).toBe("disabled");
    expect((await insights(d, true)).status).toBe("not-connected");
    expect(f).not.toHaveBeenCalled();
  });
  it("retains only verified events with stable documents, recalls, reflects and returns evidence", async () => {
    vi.stubEnv("HINDSIGHT_API_KEY", "test-only");
    vi.stubEnv("HINDSIGHT_BANK_PREFIX", "test-installation");
    const data = read();
    const d = data[0];
    d.events.forEach((e) => {
      e.synced = false;
    });
    d.events.push({
      id: "unconfirmed",
      kind: "reported",
      text: "not verified",
      at: new Date().toISOString(),
      verified: false,
    });
    save(data);
    const f = vi.fn(async (url: string) =>
      Response.json(
        url.endsWith("/reflect")
          ? {
              text: "Test response",
              based_on: { memories: [{ id: "fact-1", text: "Test evidence" }] },
            }
          : url.endsWith("/recall")
            ? { results: [{ id: "fact-1", text: "Test evidence" }] }
            : { success: true },
      ),
    );
    vi.stubGlobal("fetch", f);
    const result = await insights(d, true);
    expect(result.status).toBe("connected");
    expect(result.evidence[0].id).toBe("fact-1");
    const calls = f.mock.calls as unknown as [string, RequestInit][];
    const retains = calls.filter(([url]) => url.endsWith("/memories"));
    expect(retains.length).toBe(d.events.filter((e) => e.verified).length);
    for (const [url, req] of retains) {
      expect(url).toContain("/banks/test-installation-");
      const body = JSON.parse(req.body as string);
      expect(body.async).toBe(false);
      expect(body.items[0].document_id).not.toBe("unconfirmed");
      expect((req.headers as Record<string, string>).Authorization).toBe(
        "Bearer test-only",
      );
    }
    expect(calls.at(-1)?.[0]).toMatch(/\/reflect$/);
    expect(JSON.parse(calls.at(-1)![1].body as string).include).toEqual({
      facts: {},
    });
    const query = JSON.parse(calls.at(-1)![1].body as string).query;
    expect(query).toContain(new Date().toISOString().slice(0, 10));
    expect(query).toContain("Authoritative application snapshot");
    expect(query).toContain("current due status:");
    expect(
      read()[0]
        .events.filter((e) => e.verified)
        .every((e) => e.synced),
    ).toBe(true);
  });
  it("reports provider failures and keeps outbox events retryable", async () => {
    vi.stubEnv("HINDSIGHT_API_KEY", "test-only");
    vi.stubEnv("HINDSIGHT_BANK_PREFIX", "test-installation");
    const data = read();
    data[0].events[0].synced = false;
    save(data);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 401 })),
    );
    await expect(insights(data[0], true)).rejects.toThrow("HTTP 401");
    expect(read()[0].events[0].synced).toBe(false);
  });
  it("uses recalled evidence when reflect returns an empty evidence list", async () => {
    vi.stubEnv("HINDSIGHT_API_KEY", "test-only");
    vi.stubEnv("HINDSIGHT_BANK_PREFIX", "test-installation");
    const d = read()[0];
    d.events.forEach((e) => (e.synced = true));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        Response.json(
          url.endsWith("/reflect")
            ? { text: "Summary", based_on: { memories: [] } }
            : { results: [{ id: "fallback", text: "Retrieved fact" }] },
        ),
      ),
    );
    expect((await insights(d, true)).evidence[0].id).toBe("fallback");
  });
  it("rejects a malformed provider response instead of claiming connected", async () => {
    vi.stubEnv("HINDSIGHT_API_KEY", "test-only");
    vi.stubEnv("HINDSIGHT_BANK_PREFIX", "test-installation");
    const d = read()[0];
    d.events.forEach((e) => (e.synced = true));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        Response.json(
          url.endsWith("/reflect") ? { text: null } : { results: [] },
        ),
      ),
    );
    await expect(insights(d, true)).rejects.toThrow();
  });
});
