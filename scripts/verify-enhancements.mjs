import { loadEnvFile } from "node:process";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
loadEnvFile(".env.local");
const base = "http://127.0.0.1:3000";
const redact = (s) =>
  String(s)
    .split(process.env.HINDSIGHT_API_KEY)
    .join("[REDACTED]")
    .split(process.env.HINDSIGHT_BANK_PREFIX)
    .join("[BANK_PREFIX]");
const report = { startedAt: new Date().toISOString(), checks: [] };
function check(name) {
  report.checks.push(name);
  console.log("PASS: " + name);
}
async function req(path, body, cookie) {
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Origin: base,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(300000),
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
const date = (days) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
try {
  const a = await req("/api/action", { action: "signin", userId: "asha" }),
    b = await req("/api/action", { action: "signin", userId: "rohan" });
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  const before = await req("/api/state", null, a.cookie);
  await req(
    "/api/action",
    {
      action: "create",
      title: "Promise tracker demo · fictional",
      terms: {
        principal: 500000,
        bps: 0,
        start: date(0),
        due: date(10),
        count: 2,
        note: "Fictional feature verification. No real money transfers.",
      },
    },
    a.cookie,
  );
  let state = await req("/api/state", null, a.cookie);
  let d = state.data.debts.find(
    (d) => !before.data.debts.some((p) => p.id === d.id),
  );
  assert(d);
  report.agreementId = d.id;
  assert.equal(
    (await req("/api/action", { action: "accept", id: d.id }, b.cookie)).status,
    200,
  );
  assert.equal(
    (
      await req(
        "/api/action",
        {
          action: "promise",
          id: d.id,
          amount: 50000,
          date: date(2),
          note: "Fictional demo promise",
        },
        a.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await req(
        "/api/action",
        {
          action: "promise",
          id: d.id,
          amount: 50000,
          date: date(2),
          note: "Fictional demo promise",
        },
        b.cookie,
      )
    ).status,
    200,
  );
  check("Borrower-only promise recorded; lender denied");
  state = await req("/api/state", null, a.cookie);
  d = state.data.debts.find((p) => p.id === d.id);
  assert.equal(d.promiseStates[0].status, "pending");
  assert.equal(d.balance, 500000);
  check("Promise persisted, shared with lender, balance unchanged");
  assert.equal(
    (
      await req(
        "/api/action",
        { action: "payment", id: d.id, amount: 50000 },
        b.cookie,
      )
    ).status,
    200,
  );
  state = await req("/api/state", null, a.cookie);
  d = state.data.debts.find((p) => p.id === d.id);
  assert.equal(d.promiseStates[0].status, "pending");
  assert.equal(d.balance, 500000);
  assert.equal(
    (
      await req(
        "/api/action",
        { action: "confirm", id: d.id, paymentId: d.payments[0].id },
        a.cookie,
      )
    ).status,
    200,
  );
  state = await req("/api/state", null, b.cookie);
  d = state.data.debts.find((p) => p.id === d.id);
  assert.equal(d.promiseStates[0].status, "fulfilled");
  assert.equal(d.balance, 450000);
  assert.equal(
    d.events.filter((e) => e.kind === "promise-fulfilled").length,
    1,
  );
  check("Only confirmed payment fulfills promise; exact shared balance ₹4,500");
  const remind = await req("/api/reminder", { id: d.id }, a.cookie);
  assert.equal(remind.status, 200);
  assert(remind.data.text.includes("₹4,500.00"));
  assert(remind.data.text.includes(d.terms.due));
  assert.equal((await req("/api/reminder", { id: d.id })).status, 400);
  report.reminder = remind.data.text;
  check(
    "Authorized reminder uses verified amount/date; anonymous access denied",
  );
  const affordability = { amount: 100000, date: date(1) };
  assert.equal(
    (
      await req(
        "/api/insights",
        { id: d.id, enabled: false, affordability },
        a.cookie,
      )
    ).status,
    400,
  );
  const off = await req(
    "/api/insights",
    { id: d.id, enabled: false, affordability },
    b.cookie,
  );
  assert.equal(off.status, 200);
  assert.equal(off.data.status, "disabled");
  assert.equal(off.data.suggestion.amount, 100000);
  report.off = off.data;
  check(
    "Memory OFF and explicit affordability yield exact advisory without changing terms",
  );
  const on = await req(
    "/api/insights",
    { id: d.id, enabled: true, affordability },
    b.cookie,
  );
  assert.equal(on.status, 200);
  assert.equal(on.data.status, "connected", redact(on.data.text));
  assert(on.data.evidence.length > 0);
  assert.equal(on.data.synced, 4);
  assert.equal(on.data.suggestion.amount, 100000);
  report.on = { ...on.data, bank: "feature-demo-bank" };
  check(
    "Live retain (4 lifecycle/intention events), recall and reflect with evidence succeeded",
  );
  state = await req("/api/state", null, b.cookie);
  d = state.data.debts.find((p) => p.id === d.id);
  assert(
    d.events
      .filter((e) => e.verified || e.memoryEligible)
      .every((e) => e.synced),
  );
  assert.equal(d.balance, 450000);
  report.events = d.events;
  report.promises = d.promiseStates;
  check("Relevant promise events durably synced; timeline source IDs unique");
  assert.equal(new Set(d.events.map((e) => e.id)).size, d.events.length);
  report.passed = true;
} catch (e) {
  report.passed = false;
  report.failure = redact(e.message);
  console.log("FAIL: " + report.failure);
  process.exitCode = 1;
} finally {
  report.completedAt = new Date().toISOString();
  await writeFile(
    "docs/enhancements-live-results.json",
    redact(JSON.stringify(report, null, 2)) + "\n",
  );
  console.log("Saved sanitized feature report; application left running.");
}
