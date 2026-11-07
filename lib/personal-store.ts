import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { users } from "./store";
import {
  emptyPersonal,
  sumPaise,
  type PersonalData,
  type PersonalAction,
} from "./personal";
let connection: DatabaseSync | undefined;

function database() {
  if (connection) return connection;
  mkdirSync("data", { recursive: true });
  const db = new DatabaseSync(
    process.env.PAKKA_DB_PATH || "data/pakka.sqlite",
    { timeout: 5000 },
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS personal_finance(user_id TEXT PRIMARY KEY,value TEXT NOT NULL)",
  );
  connection = db;
  return db;
}
function owner(user: string) {
  if (!users.some((u) => u.id === user))
    throw Error("Personal ledger not available");
}
export function readPersonal(user: string): PersonalData {
  owner(user);
  const row = database()
    .prepare("SELECT value FROM personal_finance WHERE user_id=?")
    .get(user) as { value: string } | undefined;
  return row ? JSON.parse(row.value) : emptyPersonal();
}
export function savePersonal(user: string, data: PersonalData) {
  owner(user);
  database()
    .prepare(
      "INSERT INTO personal_finance VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET value=excluded.value",
    )
    .run(user, JSON.stringify(data));
}
function available<T extends { id: string }>(values: T[], id: string) {
  const found = values.find((v) => v.id === id);
  if (!found) throw Error("Personal record not available");
  return found;
}
function audit(data: PersonalData, kind: string, recordId: string) {
  data.revision++;
  data.events.push({
    id: randomUUID(),
    at: new Date().toISOString(),
    kind,
    recordId,
  });
}
export function mutatePersonal(user: string, p: PersonalAction) {
  const data = readPersonal(user);
  if (p.action === "load-demo") {
    if (data.transactions.length || data.goals.length || data.budgets.length)
      throw Error(
        "Fictional samples can only be loaded into an empty personal ledger",
      );
    const today = new Date(),
      day = Math.min(5, today.getUTCDate());
    for (let offset = 2; offset >= 0; offset--) {
      const month = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1),
      )
        .toISOString()
        .slice(0, 7);
      const date = `${month}-${String(day).padStart(2, "0")}`;
      const samples: [
        (typeof data.transactions)[number]["type"],
        string,
        number,
      ][] = [
        ["income", "Salary", user === "asha" ? 8000000 : 6500000],
        ["expense", "Housing", offset ? 1700000 : 1800000],
        [
          "expense",
          "Food",
          offset === 2 ? 620000 : offset === 1 ? 500000 : 450000,
        ],
        ["expense", "Transport", 150000],
        ["expense", "Utilities", 200000],
        [
          "expense",
          "Leisure",
          offset === 2 ? 240000 : offset === 1 ? 180000 : 90000,
        ],
      ];
      for (const [type, category, amount] of samples) {
        const id = randomUUID();
        data.transactions.push({
          id,
          type,
          category,
          amount,
          date,
          note: `Fictional ${user} sample — not a real transaction`,
          confirmed: true,
          fictional: true,
        });
        audit(data, "demo-entry", id);
      }
    }
    const month = today.toISOString().slice(0, 7),
      goalId = randomUUID();
    data.goals.push({
      id: goalId,
      name: "Fictional emergency cushion",
      target: 6000000,
      due: "",
      fictional: true,
      contributions: [
        {
          id: randomUUID(),
          amount: 500000,
          date: `${month}-${String(day).padStart(2, "0")}`,
          note: "Fictional allocation, no transfer",
          fictional: true,
        },
      ],
    });
    audit(data, "demo-goal", goalId);
    for (const [category, limit] of [
      ["Food", 600000],
      ["Leisure", 200000],
      ["Housing", 2000000],
    ] as const) {
      const id = randomUUID();
      data.budgets.push({ id, category, limit, month, fictional: true });
      audit(data, "demo-budget", id);
    }
  } else if (p.action === "transaction-save") {
    if (p.id) {
      const t = available(data.transactions, p.id);
      Object.assign(t, {
        type: p.type,
        amount: p.amount,
        date: p.date,
        category: p.category,
        note: p.note,
        confirmed: true,
      });
      audit(data, "entry-updated", t.id);
    } else {
      if (data.transactions.length >= 5000)
        throw Error("Local ledger entry limit reached");
      const id = randomUUID();
      data.transactions.push({
        id,
        type: p.type,
        amount: p.amount,
        date: p.date,
        category: p.category,
        note: p.note,
        confirmed: true,
        fictional: false,
      });
      audit(data, "entry-created", id);
    }
  } else if (p.action === "transaction-delete") {
    available(data.transactions, p.id);
    data.transactions = data.transactions.filter((t) => t.id !== p.id);
    audit(data, "entry-deleted", p.id);
  } else if (p.action === "goal-save") {
    if (p.id) {
      const g = available(data.goals, p.id);
      if (p.target < sumPaise(g.contributions.map((c) => c.amount)))
        throw Error("Target cannot be below recorded contributions");
      Object.assign(g, { name: p.name, target: p.target, due: p.due });
      audit(data, "goal-updated", g.id);
    } else {
      if (data.goals.length >= 50) throw Error("Local goal limit reached");
      const id = randomUUID();
      data.goals.push({
        id,
        name: p.name,
        target: p.target,
        due: p.due,
        contributions: [],
        fictional: false,
      });
      audit(data, "goal-created", id);
    }
  } else if (p.action === "goal-delete") {
    available(data.goals, p.id);
    data.goals = data.goals.filter((g) => g.id !== p.id);
    audit(data, "goal-deleted", p.id);
  } else if (p.action === "contribution-add") {
    const g = available(data.goals, p.goalId);
    if (p.amount > g.target - sumPaise(g.contributions.map((c) => c.amount)))
      throw Error("Contribution exceeds the goal remainder");
    if (g.contributions.length >= 5000)
      throw Error("Contribution limit reached");
    const id = randomUUID();
    g.contributions.push({
      id,
      amount: p.amount,
      date: p.date,
      note: p.note,
      fictional: g.fictional,
    });
    audit(data, "allocation-recorded", id);
  } else if (p.action === "contribution-delete") {
    const g = available(data.goals, p.goalId);
    available(g.contributions, p.id);
    g.contributions = g.contributions.filter((c) => c.id !== p.id);
    audit(data, "allocation-deleted", p.id);
  } else if (p.action === "budget-save") {
    const b = data.budgets.find(
      (b) => b.month === p.month && b.category === p.category,
    );
    if (b) {
      b.limit = p.limit;
      audit(data, "budget-updated", b.id);
    } else {
      const id = randomUUID();
      data.budgets.push({
        id,
        month: p.month,
        category: p.category,
        limit: p.limit,
        fictional: false,
      });
      audit(data, "budget-created", id);
    }
  } else if (p.action === "budget-delete") {
    available(data.budgets, p.id);
    data.budgets = data.budgets.filter((b) => b.id !== p.id);
    audit(data, "budget-deleted", p.id);
  }
  savePersonal(user, data);
  return data;
}
export function markPersonalSynced(
  user: string,
  revision: number,
  bank: string,
) {
  const data = readPersonal(user);
  data.memorySync = { revision, bank, at: new Date().toISOString() };
  savePersonal(user, data);
}
export function personalView(data: PersonalData) {
  return {
    ...data,
    memorySync: data.memorySync
      ? { revision: data.memorySync.revision, at: data.memorySync.at }
      : undefined,
  };
}
