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
const report = {
  startedAt: new Date().toISOString(),
  server: base,
  checks: [],
};
async function req(path, body, cookie) {
  const res = await fetch(base + path, {
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
    status: res.status,
    data: await res.json(),
    cookie: res.headers.get("set-cookie")?.split(";")[0],
  };
}
try {
  const a = await req("/api/action", { action: "signin", userId: "asha" });
  assert.equal(a.status, 200);
  const state = await req("/api/state", null, a.cookie);
  const debt = state.data.debts.find(
    (d) =>
      d.status === "accepted" && d.lender === "asha" && d.borrower === "rohan",
  );
  assert(debt, "No accepted shared demo agreement");
  report.agreementId = debt.id;
  report.title = debt.title;
  const off = await req(
    "/api/insights",
    { id: debt.id, enabled: false },
    a.cookie,
  );
  assert.equal(off.status, 200);
  assert.equal(off.data.status, "disabled");
  report.off = off.data;
  console.log("PASS: running demo, memory OFF baseline");
  const on = await req(
    "/api/insights",
    { id: debt.id, enabled: true },
    a.cookie,
  );
  assert.equal(on.status, 200, redact(on.data.error));
  assert.equal(on.data.status, "connected");
  assert(on.data.recalled.length && on.data.evidence.length);
  report.ashaOn = { ...on.data, bank: "demo-shared-bank" };
  console.log("PASS: running demo, real memory ON with evidence");
  const b = await req("/api/action", { action: "signin", userId: "rohan" });
  assert.equal(b.status, 200);
  const shared = await req(
    "/api/insights",
    { id: debt.id, enabled: true },
    b.cookie,
  );
  assert.equal(shared.status, 200, redact(shared.data.error));
  assert.equal(shared.data.bank, on.data.bank);
  assert.equal(shared.data.synced, 0);
  report.rohanOn = { ...shared.data, bank: "demo-shared-bank" };
  report.passed = true;
  console.log(
    "PASS: Rohan can access the shared agreement, no repeated retain",
  );
} catch (e) {
  report.passed = false;
  report.failure = redact(e.message);
  console.log("FAIL: " + report.failure);
  process.exitCode = 1;
} finally {
  report.completedAt = new Date().toISOString();
  await writeFile(
    "docs/hindsight-demo-results.json",
    redact(JSON.stringify(report, null, 2)) + "\n",
  );
  console.log("Saved sanitized demo results; server left running.");
}
