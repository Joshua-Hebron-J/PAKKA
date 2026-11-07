import { loadEnvFile } from "node:process";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
loadEnvFile(".env.local");
const key = process.env.HINDSIGHT_API_KEY,
  prefix = process.env.HINDSIGHT_BANK_PREFIX;
assert(
  key && prefix && prefix !== "pakka-local-change-me",
  "Missing configured memory credentials",
);
const endpoint = (
  process.env.HINDSIGHT_API_URL || "https://api.hindsight.vectorize.io"
).replace(/\/$/, "");
const run = randomUUID(),
  dbPath = `data/personal-verification-${run}.sqlite`,
  verificationPrefix = `${prefix}-pv-${run.slice(0, 8)}`;
const markers = {
  asha: `FICTIONAL-AZURE-${run}`,
  rohan: `FICTIONAL-IRIS-${run}`,
  shared: `FICTIONAL-SHARED-${run}`,
};
const report = {
  startedAt: new Date().toISOString(),
  syntheticData: true,
  checks: [],
  calls: [],
  results: {},
};
const safe = (s) =>
  String(s).split(key).join("[REDACTED]").split(prefix).join("[BANK_PREFIX]");
const check = (name) => {
  report.checks.push(name);
  console.log("PASS: " + name);
};
await mkdir("data", { recursive: true });
await mkdir("docs", { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec("CREATE TABLE store(id INTEGER PRIMARY KEY,value TEXT NOT NULL)");
const agreement = {
  id: randomUUID(),
  title: "Fictional isolation fixture",
  lender: "asha",
  borrower: "rohan",
  status: "accepted",
  terms: {
    principal: 100000,
    bps: 0,
    start: "2026-01-01",
    due: "2027-01-01",
    count: 1,
    note: "Fictional verification",
  },
  payments: [],
  events: [
    {
      id: randomUUID(),
      kind: "accepted",
      verified: true,
      at: "2026-01-01T10:00:00Z",
      text: `Fictional agreed debt INR 1000. Isolation reference ${markers.shared}. No payments confirmed.`,
    },
  ],
};
db.prepare("INSERT INTO store VALUES(1,?)").run(JSON.stringify([agreement]));
db.close();
const banks = new Set();
const proxy = createServer(async (req, res) => {
  let call;
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const bank = decodeURIComponent(req.url.split("/banks/")[1].split("/")[0]);
    banks.add(bank);
    call = {
      operation: req.url.endsWith("/recall")
        ? "recall"
        : req.url.endsWith("/reflect")
          ? "reflect"
          : "retain",
      bankHash: createHash("sha256").update(bank).digest("hex").slice(0, 12),
      status: null,
    };
    report.calls.push(call);
    const r = await fetch(endpoint + req.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body,
      signal: AbortSignal.timeout(150000),
    });
    const text = await r.text();
    call.status = r.status;
    res.writeHead(r.status, { "Content-Type": "application/json" });
    res.end(text);
  } catch {
    if (call) call.status = 502;
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end("{}");
  }
});
await new Promise((r) => proxy.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:3219";
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
try {
  // Never reuse an unrelated server for this destructive synthetic-fixture workflow.
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () =>
      reject(
        new Error(
          "Verification port 3219 is already in use; no application requests were made",
        ),
      ),
    );
    probe.listen(3219, "127.0.0.1", () => probe.close(resolve));
  });
  child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3219",
    ],
    {
      env: {
        ...process.env,
        PAKKA_DB_PATH: dbPath,
        HINDSIGHT_BANK_PREFIX: verificationPrefix,
        HINDSIGHT_API_URL: `http://127.0.0.1:${proxy.address().port}`,
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
    await new Promise((r) => setTimeout(r, 250));
  }
  assert(ready, "Verification server unavailable");
  const month = new Date().toISOString().slice(0, 7),
    cookies = {};
  assert.equal((await req(`/api/personal?month=${month}`)).status, 400);
  check("Unauthenticated private ledger rejected");
  for (const user of ["asha", "rohan"]) {
    cookies[user] = (
      await req("/api/action", { action: "signin", userId: user })
    ).cookie;
    assert(cookies[user]);
    let d = (await req(`/api/personal?month=${month}`, null, cookies[user]))
      .data;
    assert.equal(d.ledger.transactions.length, 0);
    assert.equal(
      (
        await req(
          "/api/personal",
          { action: "load-demo", confirmed: true },
          cookies[user],
        )
      ).status,
      200,
    );
    d = (await req(`/api/personal?month=${month}`, null, cookies[user])).data;
    // Mark all fictional source notes with user-specific evidence references, without changing amounts.
    for (const t of d.ledger.transactions) {
      assert.equal(t.fictional, true);
      const { id, type, amount, date, category } = t;
      assert.equal(
        (
          await req(
            "/api/personal",
            {
              action: "transaction-save",
              id,
              type,
              amount,
              date,
              category,
              note: `Fictional verification reference for this transaction is ${markers[user]}. This reference identifies its private ledger.`,
              confirmed: true,
            },
            cookies[user],
          )
        ).status,
        200,
      );
    }
    const count = report.calls.length;
    assert.equal(
      (
        await req(
          "/api/personal/coach",
          { month, enabled: true, syncConfirmed: false },
          cookies[user],
        )
      ).status,
      400,
    );
    assert.equal(report.calls.length, count);
    const off = (
      await req(
        "/api/personal/coach",
        { month, enabled: false, syncConfirmed: false },
        cookies[user],
      )
    ).data;
    assert.equal(off.status, "disabled");
    assert.equal(report.calls.length, count);
    assert.deepEqual(off.evidence, []);
    check(
      `${user}: explicit consent enforced and Memory OFF makes zero provider calls`,
    );
    const on = (
      await req(
        "/api/personal/coach",
        { month, enabled: true, syncConfirmed: true },
        cookies[user],
      )
    ).data;
    assert.equal(
      on.status,
      "connected",
      `${user} live coach status ${on.status}`,
    );
    assert(on.evidence.length > 0, "No evidence returned");
    const text = JSON.stringify({
      text: on.text,
      evidence: on.evidence,
      recalled: on.recalled,
    });
    report.results[user] = {
      text: on.text,
      evidence: on.evidence,
      recalled: on.recalled,
    };
    const ownIncome = user === "asha" ? "80,000" : "65,000";
    assert(text.includes(ownIncome), "Own recorded income evidence missing");
    assert(
      !text.includes(user === "asha" ? "65,000" : "80,000"),
      "Foreign income evidence leaked",
    );
    assert(!text.includes(markers[user === "asha" ? "rohan" : "asha"]));
    assert(!text.includes(markers.shared));
    assert.equal(on.summary.income, user === "asha" ? 8000000 : 6500000);
    assert.equal(on.summary.expenses, 2690000);
    assert.equal(on.summary.allocations, 500000);
    report.results[user] = {
      status: on.status,
      evidenceCount: on.evidence.length,
      incomePaise: on.summary.income,
      expensePaise: on.summary.expenses,
      savingCapPaise: on.summary.starterSaving,
      ownIncomeEvidence: true,
      foreignMarker: false,
    };
    check(
      `${user}: live retain, recall, reflect with own evidence and deterministic totals`,
    );
  }
  const a = (await req(`/api/personal?month=${month}`, null, cookies.asha))
      .data,
    b = (await req(`/api/personal?month=${month}`, null, cookies.rohan)).data;
  assert.notEqual(a.ledger.transactions[0].id, b.ledger.transactions[0].id);
  assert.equal(
    (
      await req(
        "/api/personal",
        { action: "transaction-delete", id: a.ledger.transactions[0].id },
        cookies.rohan,
      )
    ).status,
    400,
  );
  check("Cross-user entry deletion rejected; personal rows remain isolated");
  const shared = (
    await req(
      "/api/insights",
      { id: agreement.id, enabled: true },
      cookies.asha,
    )
  ).data;
  assert.equal(shared.status, "connected");
  const sharedText = JSON.stringify({
    text: shared.text,
    evidence: shared.evidence,
    recalled: shared.recalled,
  });
  assert(sharedText.includes(markers.shared));
  assert(
    !sharedText.includes(markers.asha) && !sharedText.includes(markers.rohan),
  );
  assert.equal(banks.size, 3);
  check(
    "Shared agreement memory still live and isolated from both personal banks",
  );
  // Actual provider replacement after deletion, not merely a mocked payload check.
  const deleted = a.ledger.transactions.find(
    (t) => t.date.startsWith(month) && t.type === "income",
  );
  assert(deleted);
  assert.equal(
    (
      await req(
        "/api/personal",
        { action: "transaction-delete", id: deleted.id },
        cookies.asha,
      )
    ).status,
    200,
  );
  const updated = (
    await req(
      "/api/personal/coach",
      { month, enabled: true, syncConfirmed: true },
      cookies.asha,
    )
  ).data;
  assert.equal(updated.status, "connected");
  assert.equal(updated.summary.income, 0);
  check(
    "Edited/deleted personal snapshot retained again; current ledger stays authoritative",
  );
  assert(report.calls.every((c) => c.status >= 200 && c.status < 300));
  report.passed = true;
  check("All real retain, recall and reflect calls returned 2xx");
} catch (e) {
  report.passed = false;
  report.error = safe(e.message);
  process.exitCode = 1;
  console.error("FAIL: " + safe(e.message));
} finally {
  report.completedAt = new Date().toISOString();
  await writeFile(
    "docs/personal-live-results.json",
    safe(JSON.stringify(report, null, 2)),
  );
  if (child) child.kill();
  await new Promise((r) => proxy.close(r));
  console.log("Sanitized report: docs/personal-live-results.json");
}
