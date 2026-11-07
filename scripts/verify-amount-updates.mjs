import { loadEnvFile } from "node:process";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
loadEnvFile(".env.local");
const run = randomUUID(),
  path = `data/amount-verification-${run}.sqlite`,
  base = "http://127.0.0.1:3221";
const report = {
  startedAt: new Date().toISOString(),
  syntheticData: true,
  checks: [],
  liveMemory: false,
};
const fixture = (id) => ({
  id,
  title:
    id === "api-fixture"
      ? "Fictional automated amount fixture"
      : "Fictional browser amount fixture",
  lender: "asha",
  borrower: "rohan",
  status: "accepted",
  terms: {
    principal: 100000,
    bps: 0,
    start: "2026-01-01",
    due: "2027-01-01",
    count: 2,
    note: "Isolated fictional amount workflow only. No real money.",
  },
  payments: [
    {
      id: randomUUID(),
      by: "rohan",
      amount: 25000,
      status: "confirmed",
      date: "2026-02-01",
    },
  ],
  events: [],
});
mkdirSync("data", { recursive: true });
const db = new DatabaseSync(path);
db.exec("CREATE TABLE store(id INTEGER PRIMARY KEY,value TEXT NOT NULL)");
db.prepare("INSERT INTO store VALUES(1,?)").run(
  JSON.stringify([fixture("api-fixture"), fixture("browser-fixture")]),
);
db.close();
let child;
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
function check(name) {
  report.checks.push(name);
  console.log("PASS: " + name);
}
try {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () =>
      reject(Error("Verification port occupied; no application requests made")),
    );
    probe.listen(3221, "127.0.0.1", () => probe.close(resolve));
  });
  child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3221",
    ],
    {
      env: {
        ...process.env,
        PAKKA_DB_PATH: path,
        HINDSIGHT_BANK_PREFIX: `${process.env.HINDSIGHT_BANK_PREFIX}-amount-test-${run.slice(0, 8)}`,
      },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.resume();
  child.stderr.resume();
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base + "/api/state")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  assert(ready, "Fixture server unavailable");
  const a = (await req("/api/action", { action: "signin", userId: "asha" }))
      .cookie,
    b = (await req("/api/action", { action: "signin", userId: "rohan" }))
      .cookie;
  const action = (payload, cookie = b) =>
    req("/api/action", { id: "api-fixture", ...payload }, cookie);
  assert.equal(
    (
      await action(
        {
          action: "request-amount-update",
          amount: 80001,
          reason: "Fictional correction",
        },
        a,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await action({
        action: "request-amount-update",
        amount: 80001,
        reason: "Fictional correction",
      })
    ).status,
    200,
  );
  let d = (await req("/api/state", null, a)).data.debts.find(
      (d) => d.id === "api-fixture",
    ),
    id = d.amendment.amountUpdateId;
  assert.equal(d.terms.principal, 100000);
  assert.equal(d.balance, 75000);
  assert.equal(d.amountUpdates[0].status, "pending");
  check(
    "Borrower proposal visible to lender; original terms/balance unchanged",
  );
  assert.equal(
    (await action({ action: "approve-amendment", amendmentId: id })).status,
    400,
  );
  assert.equal(
    (await action({ action: "approve-amendment", amendmentId: id }, a)).status,
    200,
  );
  assert.equal(
    (await action({ action: "approve-amendment", amendmentId: id }, a)).status,
    400,
  );
  d = (await req("/api/state", null, b)).data.debts.find(
    (d) => d.id === "api-fixture",
  );
  assert.equal(d.balance, 55001);
  assert.equal(d.payments[0].amount, 25000);
  assert.equal(d.amountUpdates[0].status, "approved");
  check(
    "Lender-only approval preserves confirmed repayment and recalculates exact balance; replay denied",
  );
  assert.equal(
    (
      await action({
        action: "request-amount-update",
        amount: 90000,
        reason: "Fictional second proposal",
      })
    ).status,
    200,
  );
  d = (await req("/api/state", null, a)).data.debts.find(
    (d) => d.id === "api-fixture",
  );
  const second = d.amendment.amountUpdateId;
  assert.equal(
    (await action({ action: "approve-amendment", amendmentId: id }, a)).status,
    400,
  );
  assert.equal(
    (await action({ action: "reject-amendment", amendmentId: second }, a))
      .status,
    200,
  );
  d = (await req("/api/state", null, b)).data.debts.find(
    (d) => d.id === "api-fixture",
  );
  assert.equal(d.balance, 55001);
  assert.deepEqual(
    d.amountUpdates.map((r) => r.status),
    ["approved", "rejected"],
  );
  check(
    "Stale request cannot approve newer proposal; rejection preserves terms and persists history",
  );
  assert.equal(
    (
      await action({
        action: "request-amount-update",
        amount: 24999,
        reason: "Invalid floor",
      })
    ).status,
    400,
  );
  check("Amount below confirmed repayments rejected");
  if (process.env.HINDSIGHT_API_KEY) {
    const result = (
      await req("/api/insights", { id: "api-fixture", enabled: true }, a)
    ).data;
    assert.equal(result.status, "connected");
    assert(result.evidence.length > 0);
    const checkDb = new DatabaseSync(path, { readOnly: true });
    const stored = JSON.parse(
      checkDb.prepare("SELECT value FROM store WHERE id=1").get().value,
    ).find((d) => d.id === "api-fixture");
    checkDb.close();
    assert(
      stored.events.find((e) => e.kind === "amount-update-approved").synced,
    );
    assert(
      stored.events
        .filter((e) => e.kind !== "amount-update-approved")
        .every((e) => !e.synced),
    );
    report.liveMemory = true;
    report.evidenceCount = result.evidence.length;
    check(
      "Real Hindsight retain/recall/reflect succeeded; approved event synced through existing outbox only",
    );
  }
  report.passed = true;
  report.completedAt = new Date().toISOString();
  writeFileSync(
    "docs/amount-live-results.json",
    JSON.stringify(report, null, 2),
  );
  if (process.argv.includes("--serve")) {
    console.log(
      "Fictional browser fixture ready at http://127.0.0.1:3221; send any input to stop.",
    );
    await new Promise((resolve) => {
      process.stdin.resume();
      process.stdin.once("data", resolve);
      process.stdin.once("end", resolve);
    });
  }
} catch (e) {
  report.passed = false;
  report.error =
    "Isolated verification failed: " +
    String(e.message)
      .split(process.env.HINDSIGHT_API_KEY || "__missing__")
      .join("[REDACTED]")
      .split(process.env.HINDSIGHT_BANK_PREFIX || "__missing__")
      .join("[BANK_PREFIX]");
  process.exitCode = 1;
  console.error(report.error);
} finally {
  report.completedAt = new Date().toISOString();
  writeFileSync(
    "docs/amount-live-results.json",
    JSON.stringify(report, null, 2),
  );
  child?.kill();
}
