import { loadEnvFile } from "node:process";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import assert from "node:assert/strict";

loadEnvFile(".env.local");
const key = process.env.HINDSIGHT_API_KEY;
const prefix = process.env.HINDSIGHT_BANK_PREFIX;
assert(
  key && prefix && prefix !== "pakka-local-change-me",
  "Missing required Hindsight configuration",
);
const endpoint = (
  process.env.HINDSIGHT_API_URL || "https://api.hindsight.vectorize.io"
).replace(/\/$/, "");
const previous = process.argv.includes("--resume")
  ? JSON.parse(await readFile("docs/hindsight-live-results.json", "utf8"))
  : null;
const run = previous?.run || randomUUID();
const markers = {
  asha: `COBALT-FOX-${run}`,
  rohan: `AMBER-OWL-${run}`,
  shared: `JADE-OTTER-${run}`,
};
const fixture = (scope, lender, borrower) => ({
  id: randomUUID(),
  title: `Fictional live verification: ${scope}`,
  lender,
  borrower,
  status: "accepted",
  terms: {
    principal: 1000000,
    bps: 0,
    start: "2026-10-01",
    due: "2026-11-01",
    count: 1,
    note: "Fictional automated verification only",
  },
  payments: [
    {
      id: randomUUID(),
      amount: 250000,
      by: borrower,
      status: "confirmed",
      date: "2026-10-20",
    },
  ],
  events: [
    {
      id: randomUUID(),
      kind: "confirmed",
      verified: true,
      at: "2026-10-20T10:00:00Z",
      text: `Fictional automated test, not a real debt. Agreement reference ${markers[scope]}. ${lender} lent ${borrower} INR 10000 without interest, due 2026-11-01. Both parties confirmed INR 2500 repayment on 2026-10-20, leaving INR 7500. This reference belongs exclusively to this agreement.`,
    },
  ],
});
let fixtures = [
  fixture("asha", "asha", "verification-only-a"),
  fixture("rohan", "rohan", "verification-only-b"),
  fixture("shared", "asha", "rohan"),
];
await mkdir("data", { recursive: true });
await mkdir("docs", { recursive: true });
const dbPath = `data/live-verification-${run}.sqlite`;
const db = new DatabaseSync(dbPath);
if (previous) {
  fixtures = JSON.parse(
    db.prepare("SELECT value FROM store WHERE id=1").get().value,
  );
} else {
  db.exec("CREATE TABLE store(id INTEGER PRIMARY KEY,value TEXT NOT NULL)");
  db.prepare("INSERT INTO store VALUES(1,?)").run(JSON.stringify(fixtures));
}
db.close();
const report = {
  startedAt: previous?.startedAt || new Date().toISOString(),
  resumedAt: previous ? new Date().toISOString() : null,
  run,
  fixtureDatabase: dbPath,
  syntheticData: true,
  checks: [],
  calls: previous?.calls || [],
  comparisons: {},
};
const redact = (text) =>
  String(text)
    .split(key)
    .join("[REDACTED]")
    .split(prefix)
    .join("[BANK_PREFIX]");
let child;
const proxy = createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const operation = req.url.endsWith("/recall")
      ? "recall"
      : req.url.endsWith("/reflect")
        ? "reflect"
        : "retain";
    const entry = {
      operation,
      status: null,
      startedAt: new Date().toISOString(),
    };
    report.calls.push(entry);
    const upstream = await fetch(endpoint + req.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body,
      signal: AbortSignal.timeout(180000),
    });
    const text = await upstream.text();
    entry.status = upstream.status;
    entry.durationMs = Date.now() - Date.parse(entry.startedAt);
    if (!upstream.ok) entry.error = redact(text).slice(0, 1800);
    res.writeHead(upstream.status, { "Content-Type": "application/json" });
    res.end(text);
  } catch (e) {
    report.calls.at(-1).error = redact(e.message);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Verification upstream connection failed" }),
    );
  }
});
await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve));
const port = Number(process.env.PAKKA_VERIFY_PORT || 3217);
const base = `http://127.0.0.1:${port}`;
let serverLogs = "";
const check = (name, details) => {
  report.checks.push({ name, passed: true, ...details });
  console.log(`PASS: ${name}`);
};
async function request(path, body, cookie) {
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
try {
  child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PAKKA_DB_PATH: dbPath,
        HINDSIGHT_API_URL: `http://127.0.0.1:${proxy.address().port}`,
      },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (c) => {
    serverLogs += redact(c.toString());
  });
  child.stderr.on("data", (c) => {
    serverLogs += redact(c.toString());
  });
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(base + "/api/state");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  assert(ready, "Local verification server failed to start");
  const a = await request("/api/action", { action: "signin", userId: "asha" });
  const b = await request("/api/action", { action: "signin", userId: "rohan" });
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert(a.cookie && b.cookie && a.cookie !== b.cookie);
  check("Separate authenticated demo sessions established");
  for (const [user, cookie, own, foreign] of [
    ["asha", a.cookie, fixtures[0], fixtures[1]],
    ["rohan", b.cookie, fixtures[1], fixtures[0]],
  ]) {
    const state = await request("/api/state", null, cookie);
    assert(state.data.debts.some((d) => d.id === own.id));
    assert(!state.data.debts.some((d) => d.id === foreign.id));
    check(`${user}: foreign agreement absent from state`);
    const before = report.calls.length;
    for (const enabled of [false, true]) {
      const deny = await request(
        "/api/insights",
        { id: foreign.id, enabled },
        cookie,
      );
      assert.equal(deny.status, 400);
      assert.equal(deny.data.error, "Agreement not available");
    }
    assert.equal(report.calls.length, before);
    check(`${user}: foreign memory denied before provider call`);
    const off = await request(
      "/api/insights",
      { id: own.id, enabled: false },
      cookie,
    );
    assert.equal(off.status, 200);
    assert.equal(off.data.status, "disabled");
    assert.equal(report.calls.length, before);
    check(`${user}: memory OFF makes zero provider calls`);
    console.log(`Testing real retain/recall/reflect for ${user}…`);
    const on = await request(
      "/api/insights",
      { id: own.id, enabled: true },
      cookie,
    );
    assert.equal(on.status, 200, `Insight failed: ${redact(on.data.error)}`);
    assert.equal(on.data.status, "connected");
    assert(on.data.recalled.length > 0, "Recall returned no facts");
    assert(on.data.text.length > 0, "Reflect returned no text");
    assert(on.data.evidence.length > 0, "No evidence returned");
    const visible = JSON.stringify([
      on.data.text,
      on.data.evidence,
      on.data.recalled,
    ]);
    assert(!visible.includes(markers[user === "asha" ? "rohan" : "asha"]));
    // Extraction may omit arbitrary prose markers. Source metadata is authoritative.
    const sourced = [...on.data.evidence, ...on.data.recalled].filter(
      (f) => f.metadata?.agreement_id,
    );
    assert(sourced.length > 0, "No source agreement metadata returned");
    for (const f of sourced) assert.equal(f.metadata.agreement_id, own.id);
    report.comparisons[user] = {
      off: off.data,
      on: { ...on.data, bank: user + "-private-bank" },
      agreementId: own.id,
      eventId: own.events[0].id,
    };
    check(`${user}: live retain/recall/reflect returned scoped evidence`);
  }
  console.log("Testing shared agreement memory for both parties…");
  const shared = await request(
    "/api/insights",
    { id: fixtures[2].id, enabled: true },
    a.cookie,
  );
  assert.equal(shared.status, 200, redact(shared.data.error));
  const retained = report.calls.filter((c) => c.operation === "retain").length;
  const sharedB = await request(
    "/api/insights",
    { id: fixtures[2].id, enabled: true },
    b.cookie,
  );
  assert.equal(sharedB.status, 200, redact(sharedB.data.error));
  assert.equal(sharedB.data.bank, shared.data.bank);
  assert.equal(
    report.calls.filter((c) => c.operation === "retain").length,
    retained,
  );
  assert(sharedB.data.evidence.length > 0);
  for (const result of [shared, sharedB]) {
    const text = JSON.stringify([
      result.data.text,
      result.data.evidence,
      result.data.recalled,
    ]);
    assert(!text.includes(markers.asha));
    assert(!text.includes(markers.rohan));
  }
  report.comparisons.shared = {
    agreementId: fixtures[2].id,
    asha: { ...shared.data, bank: "shared-bank" },
    rohan: { ...sharedB.data, bank: "shared-bank" },
  };
  check(
    "Both authorized parties share one bank; no duplicate retain or private markers",
  );
  const noSession = await request("/api/insights", {
    id: fixtures[2].id,
    enabled: true,
  });
  assert.equal(noSession.status, 400);
  check("Unauthenticated memory request rejected");
  const recheck = await request(
    "/api/insights",
    { id: fixtures[0].id, enabled: true },
    a.cookie,
  );
  assert.equal(recheck.status, 200, redact(recheck.data.error));
  for (const fact of [...recheck.data.evidence, ...recheck.data.recalled]) {
    if (fact.metadata?.agreement_id)
      assert.equal(fact.metadata.agreement_id, fixtures[0].id);
    assert(!JSON.stringify(fact).includes(markers.rohan));
    assert(!JSON.stringify(fact).includes(markers.shared));
  }
  report.comparisons.ashaAfterAllBanksPopulated = {
    ...recheck.data,
    bank: "asha-private-bank",
  };
  check(
    "Asha rechecked after all banks populated: only own source agreement IDs",
  );
  report.passed = true;
} catch (e) {
  report.passed = false;
  report.failure = redact(e.message);
  console.log(`FAIL: ${report.failure}`);
  process.exitCode = 1;
} finally {
  if (child) {
    child.kill();
    await new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once("exit", resolve);
      setTimeout(resolve, 3000);
    });
  }
  await new Promise((resolve) => proxy.close(resolve));
  report.completedAt = new Date().toISOString();
  await writeFile(
    "docs/hindsight-live-results.json",
    redact(JSON.stringify(report, null, 2)) + "\n",
  );
  console.log(
    `Saved sanitized report: docs/hindsight-live-results.json (${report.calls.length} real provider calls)`,
  );
  if (!report.passed && report.calls.length === 0)
    console.log("Local server diagnostics: " + redact(serverLogs).slice(-1500));
}
