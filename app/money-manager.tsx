"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldCheck,
  Sparkles,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { money, paise } from "@/lib/finance";
import {
  incomeCategories,
  expenseCategories,
  type PersonalData,
  type Transaction,
  type Goal,
  type Budget,
  monthlySummary,
} from "@/lib/personal";

type View = {
  ledger: PersonalData;
  summary: ReturnType<typeof monthlySummary>;
  memoryConfigured: boolean;
};
type Coach = {
  status: string;
  text: string;
  baseline: string;
  nextAction: string;
  evidence: { id: string; text: string }[];
};
type Editor =
  | { kind: "transaction"; value?: Transaction }
  | { kind: "goal"; value?: Goal }
  | { kind: "budget"; value?: Budget }
  | { kind: "contribution"; goal: Goal };
export default function MoneyManager({ view }: { view: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<View>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<Editor>();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [filter, setFilter] = useState("All");
  const [memory, setMemory] = useState(false),
    [consent, setConsent] = useState(false),
    [coach, setCoach] = useState<Coach>();
  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    if (editor && dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
      if (editor) previous?.focus();
    };
  }, [editor]);
  const load = useCallback(async () => {
    const r = await fetch(`/api/personal?month=${month}`, {
      cache: "no-store",
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "Unable to load your ledger");
    setData(d);
    return d;
  }, [month]);
  useEffect(() => {
    let active = true;
    fetch(`/api/personal?month=${month}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [month]);
  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Could not save");
      setCoach(undefined);
      await load();
      setEditor(undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function remove(payload: Record<string, unknown>, label: string) {
    if (window.confirm(label)) void act(payload);
  }
  async function ask(enabled: boolean) {
    setBusy(true);
    setError("");
    setCoach(undefined);
    try {
      const r = await fetch("/api/personal/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          enabled,
          syncConfirmed: enabled && consent,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Coach unavailable");
      setCoach(d);
      if (enabled) await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setConsent(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editor) return;
    const f = new FormData(e.currentTarget),
      v = (k: string) => String(f.get(k) || "");
    try {
      if (editor.kind === "transaction")
        await act({
          action: "transaction-save",
          ...(editor.value ? { id: editor.value.id } : {}),
          type,
          amount: paise(v("amount")),
          date: v("date"),
          category: v("category"),
          note: v("note"),
          confirmed: f.get("confirmed") === "on",
        });
      if (editor.kind === "goal")
        await act({
          action: "goal-save",
          ...(editor.value ? { id: editor.value.id } : {}),
          name: v("name"),
          target: paise(v("amount")),
          due: v("due"),
        });
      if (editor.kind === "budget")
        await act({
          action: "budget-save",
          month,
          category: v("category"),
          limit: v("amount") === "0" ? 0 : paise(v("amount")),
        });
      if (editor.kind === "contribution")
        await act({
          action: "contribution-add",
          goalId: editor.goal.id,
          amount: paise(v("amount")),
          date: v("date"),
          note: v("note"),
          confirmed: f.get("confirmed") === "on",
        });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const coachCopy = coach?.text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\[([^\]]+)\]/g, (original, refs: string) => {
      const indexes = refs
        .split(",")
        .map((id) => coach.evidence.findIndex((e) => e.id === id.trim()));
      return indexes.length && indexes.every((i) => i >= 0)
        ? `[${indexes.map((i) => i + 1).join(", ")}]`
        : original;
    });
  const current = data?.summary.month === month ? data : undefined;
  const s = current?.summary,
    ledger = current?.ledger;
  const isMoney = view === "Money Manager",
    isBudgets = view === "Budgets",
    isGoals = view === "Savings Goals";
  const percent = (n: number, d: number) =>
    d ? Math.min(100, Math.round((n / d) * 100)) : 0;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section
      className="personal-space"
      aria-label="Private personal finance"
      aria-busy={busy}
    >
      <div className="personal-toolbar">
        <span className="privacy-pill">
          <ShieldCheck size={16} />
          Only you · separate from shared agreements
        </span>
        <label>
          Reporting month
          <input
            aria-label="Reporting month"
            type="month"
            value={month}
            disabled={busy}
            onChange={(e) => {
              setMonth(e.target.value);
              setCoach(undefined);
              setConsent(false);
            }}
            required
          />
        </label>
      </div>
      <p className="personal-disclosure">
        User-confirmed records, not bank-verified. Shared repayments are never
        imported. Record a repayment expense manually only once. Goal
        contributions allocate existing funds; they are not expenses or
        transfers.
      </p>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      {!current ? (
        <div className="card personal-empty">
          Loading your private ledger…
          {error && (
            <button onClick={() => load().catch((e) => setError(e.message))}>
              Retry
            </button>
          )}
        </div>
      ) : (
        <>
          {!ledger!.transactions.length &&
            !ledger!.goals.length &&
            !ledger!.budgets.length && (
              <div className="card personal-welcome">
                <div>
                  <span className="eyebrow">A FRESH START</span>
                  <h2>Your money, a little clearer.</h2>
                  <p>
                    Add confirmed entries, or explore an explicitly fictional
                    three-month sample. Nothing syncs to AI until you choose.
                  </p>
                </div>
                <button
                  disabled={busy}
                  onClick={() => act({ action: "load-demo", confirmed: true })}
                >
                  Load fictional sample
                </button>
              </div>
            )}
          {ledger!.transactions.some((t) => t.fictional) && (
            <div className="fictional-banner">
              Fictional demo records are included in these totals. They are
              labelled individually and do not represent real earnings or
              spending.
            </div>
          )}
          {isMoney && (
            <>
              <div className="personal-metrics">
                {[
                  [TrendingUp, "Monthly income", s!.income],
                  [TrendingDown, "Monthly expenses", s!.expenses],
                  [Wallet, "Net cash flow", s!.net],
                ].map(([Icon, label, value]) => {
                  const I = Icon as typeof Wallet;
                  return (
                    <article className="card" key={String(label)}>
                      <I size={21} />
                      <span>{String(label)}</span>
                      <strong>{money(value as number)}</strong>
                      <small>
                        Confirmed entries ·{" "}
                        <span className="metric-month">{month}</span>
                      </small>
                    </article>
                  );
                })}
                <article className="card">
                  <Target size={21} />
                  <span>Savings rate</span>
                  <strong>
                    {s!.savingsRateBps === null
                      ? "—"
                      : `${(s!.savingsRateBps / 100).toFixed(2)}%`}
                  </strong>
                  <small>
                    {s!.income
                      ? "Net cash flow ÷ recorded income"
                      : "No recorded income; rate unavailable"}
                  </small>
                </article>
              </div>
              <div className="personal-grid">
                <section className="card">
                  <div className="personal-card-head">
                    <h2>Income & expenses</h2>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => {
                        setType("expense");
                        setEditor({ kind: "transaction" });
                      }}
                    >
                      <Plus size={16} />
                      Add entry
                    </button>
                  </div>
                  <label className="personal-filter">
                    Category
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option>All</option>
                      {[...incomeCategories, ...expenseCategories].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <div className="entry-list">
                    {ledger!.transactions
                      .filter(
                        (t) =>
                          t.date.startsWith(month + "-") &&
                          (filter === "All" || t.category === filter),
                      )
                      .sort(
                        (a, b) =>
                          b.date.localeCompare(a.date) ||
                          a.id.localeCompare(b.id),
                      )
                      .map((t) => (
                        <article className="personal-entry" key={t.id}>
                          <span className={`entry-symbol ${t.type}`}>
                            {t.type === "income" ? "+" : "−"}
                          </span>
                          <div>
                            <strong>{t.category}</strong>
                            <small>
                              {t.date} · {t.type}
                              {t.fictional ? " · Fictional" : ""}
                            </small>
                            {t.note && <p>{t.note}</p>}
                          </div>
                          <div className="entry-end">
                            <strong>{money(t.amount)}</strong>
                            <div className="entry-actions">
                              <button
                                aria-label={`Edit ${t.category} ${t.date}`}
                                disabled={busy}
                                onClick={() => {
                                  setType(t.type);
                                  setEditor({ kind: "transaction", value: t });
                                }}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                aria-label={`Delete ${t.category} ${t.date}`}
                                disabled={busy}
                                onClick={() =>
                                  remove(
                                    { action: "transaction-delete", id: t.id },
                                    "Delete this personal entry? Totals will be recalculated. Provider memory is refreshed only on your next explicit sync.",
                                  )
                                }
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    {!ledger!.transactions.some(
                      (t) =>
                        t.date.startsWith(month + "-") &&
                        (filter === "All" || t.category === filter),
                    ) && (
                      <p className="personal-empty">
                        No confirmed entries for this selection.
                      </p>
                    )}
                  </div>
                </section>
                <section className="card">
                  <div className="personal-card-head">
                    <h2>Where it went</h2>
                    <span className="badge">Expenses</span>
                  </div>
                  {s!.categories
                    .filter((c) => c.amount > 0)
                    .map((c) => (
                      <div className="category-row" key={c.category}>
                        <div>
                          <span>{c.category}</span>
                          <strong>{money(c.amount)}</strong>
                        </div>
                        <progress
                          aria-label={`${c.category} share of expenses`}
                          value={c.amount}
                          max={Math.max(1, s!.expenses)}
                        />
                        <small>
                          {percent(c.amount, s!.expenses)}% of recorded expenses
                        </small>
                      </div>
                    ))}
                  {!s!.expenses && (
                    <p className="personal-empty">
                      Record an expense to see your category breakdown.
                    </p>
                  )}
                  <p className="personal-disclosure">
                    Net cash flow is recorded income minus expenses. Goal
                    allocations do not change this total. This is not your bank
                    balance.
                  </p>
                </section>
              </div>
            </>
          )}
          {isBudgets && (
            <section className="card">
              <div className="personal-card-head">
                <div>
                  <h2>Give each category a little direction.</h2>
                  <p>Monthly spending limits, based on confirmed expenses.</p>
                </div>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => setEditor({ kind: "budget" })}
                >
                  <Plus size={16} />
                  Set budget
                </button>
              </div>
              <div className="budget-grid">
                {s!.budgets.map((b) => (
                  <article className="budget-item" key={b.id}>
                    <div className="personal-card-head">
                      <h3>{b.category}</h3>
                      <span
                        className={`badge ${b.spent > b.limit ? "over-budget" : ""}`}
                      >
                        {b.spent > b.limit
                          ? "Over budget"
                          : b.spent === b.limit
                            ? "At limit"
                            : "Within budget"}
                      </span>
                    </div>
                    <strong>
                      {money(b.spent)} <small>of {money(b.limit)}</small>
                    </strong>
                    <progress
                      aria-label={`${b.category} budget used`}
                      value={Math.min(b.spent, b.limit || 1)}
                      max={b.limit || 1}
                    />
                    <p>
                      {b.spent > b.limit
                        ? `${money(b.spent - b.limit)} over the limit`
                        : `${money(b.limit - b.spent)} remaining`}
                      {b.fictional ? " · Fictional" : ""}
                    </p>
                    <div className="entry-actions">
                      <button
                        disabled={busy}
                        onClick={() => setEditor({ kind: "budget", value: b })}
                      >
                        Edit budget
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          remove(
                            { action: "budget-delete", id: b.id },
                            "Delete this monthly budget?",
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!s!.budgets.length && (
                <p className="personal-empty">
                  No category budgets for {month}. A zero limit is supported.
                </p>
              )}
            </section>
          )}
          {isGoals && (
            <section className="card">
              <div className="personal-card-head">
                <div>
                  <h2>A little closer to what matters.</h2>
                  <p>
                    Contributions record an allocation, never move money or add
                    expenses.
                  </p>
                </div>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => setEditor({ kind: "goal" })}
                >
                  <Plus size={16} />
                  New goal
                </button>
              </div>
              <div className="budget-grid">
                {s!.goals.map((g) => (
                  <article className="budget-item" key={g.id}>
                    <div className="personal-card-head">
                      <h3>{g.name}</h3>
                      <span className="badge">
                        {g.contributed >= g.target
                          ? "Reached"
                          : g.due && g.due < today
                            ? "Past target date"
                            : "In progress"}
                      </span>
                    </div>
                    <strong>
                      {money(g.contributed)} <small>of {money(g.target)}</small>
                    </strong>
                    <progress
                      aria-label={`${g.name} progress`}
                      value={g.contributed}
                      max={g.target}
                    />
                    <p>
                      {money(g.target - g.contributed)} to go
                      {g.due ? ` · Target ${g.due}` : ""}
                      {g.fictional ? " · Fictional" : ""}
                    </p>
                    <div className="entry-actions">
                      <button
                        className="primary"
                        disabled={busy || g.contributed >= g.target}
                        onClick={() =>
                          setEditor({ kind: "contribution", goal: g })
                        }
                      >
                        Add contribution
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => setEditor({ kind: "goal", value: g })}
                      >
                        Edit
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          remove(
                            { action: "goal-delete", id: g.id },
                            "Delete this goal and its allocation history? This does not delete income or expenses or move any money.",
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                    <details>
                      <summary>
                        Contribution history ({g.contributions.length})
                      </summary>
                      {g.contributions.map((c) => (
                        <div className="contribution-row" key={c.id}>
                          <span>
                            {c.date} · {money(c.amount)}
                            {c.fictional ? " · Fictional" : ""}
                            <small>{c.note}</small>
                          </span>
                          <button
                            aria-label={`Delete contribution ${c.date}`}
                            disabled={busy}
                            onClick={() =>
                              remove(
                                {
                                  action: "contribution-delete",
                                  goalId: g.id,
                                  id: c.id,
                                },
                                "Remove this recorded allocation? No money will move.",
                              )
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </details>
                  </article>
                ))}
              </div>
              {!s!.goals.length && (
                <p className="personal-empty">
                  Create a savings goal, then record confirmed allocations
                  toward it.
                </p>
              )}
            </section>
          )}
          {!isMoney && !isBudgets && !isGoals && (
            <div className="personal-grid">
              <section className="card coach-card">
                <div className="personal-card-head">
                  <h2>
                    <Sparkles size={21} />
                    Your AI Money Coach
                  </h2>
                  <button
                    role="switch"
                    aria-checked={memory}
                    disabled={busy}
                    className={memory ? "memory-toggle on" : "memory-toggle"}
                    onClick={() => {
                      setMemory(!memory);
                      setConsent(false);
                      setCoach(undefined);
                    }}
                  >
                    Memory {memory ? "ON" : "OFF"}
                  </button>
                </div>
                <p>
                  Private context for your own records. Shared agreement
                  memories are never queried.
                </p>
                <div className="coach-baseline">
                  <strong>Ledger-only next step</strong>
                  <p>
                    {!s!.entryCount
                      ? "Add confirmed entries before considering a savings amount."
                      : s!.starterSaving
                        ? `If your records are complete and upcoming essentials are covered, consider up to ${money(s!.starterSaving)} for a goal.`
                        : "Review your essential costs before committing more savings."}
                  </p>
                  <small>
                    Cap: the smaller of 10% of recorded income and positive net
                    cash flow after this month’s goal allocations. No assumed
                    opening balance.
                  </small>
                </div>
                {memory && (
                  <>
                    <p className="personal-disclosure">
                      Explicit sync sends all your current personal transactions
                      (including notes), goals, contributions and budgets to
                      Hindsight. It replaces the previous personal snapshot.
                      Edits or deletions are reflected at the provider only
                      after another explicit sync. Data stays scoped to this
                      demo account’s private bank.
                    </p>
                    <label className="consent-line">
                      <input
                        type="checkbox"
                        checked={consent}
                        disabled={busy}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      I choose to sync these personal records to Hindsight and
                      ask for coaching.
                    </label>
                    {!current.memoryConfigured && (
                      <p className="fictional-banner">
                        Hindsight is not configured; the ledger-only result
                        remains available.
                      </p>
                    )}
                  </>
                )}
                <div className="coach-actions">
                  <button
                    className="primary"
                    disabled={busy || (memory && !consent)}
                    onClick={() => ask(memory)}
                  >
                    {busy
                      ? "Working…"
                      : memory
                        ? "Sync confirmed records & ask coach"
                        : "Show Memory OFF result"}
                  </button>
                  {memory && (
                    <button disabled={busy} onClick={() => ask(false)}>
                      Compare ledger-only
                    </button>
                  )}
                </div>
                {ledger!.memorySync && (
                  <small className="sync-note">
                    Last retained revision {ledger!.memorySync.revision} of{" "}
                    {ledger!.revision} ·{" "}
                    {new Date(ledger!.memorySync.at).toLocaleString()}
                    {ledger!.memorySync.revision !== ledger!.revision
                      ? " · Changes await your next explicit sync"
                      : ""}
                  </small>
                )}
                {coach && (
                  <div className="coach-result" aria-live="polite">
                    <span className="badge">
                      {coach.status === "connected"
                        ? "Live Hindsight · AI interpretation"
                        : coach.status === "disabled"
                          ? "Memory OFF · Ledger only"
                          : coach.status === "no-records"
                            ? "No records to sync"
                            : coach.status === "not-connected"
                              ? "Not connected"
                              : "Offline fallback"}
                    </span>
                    <p className="coach-prose">{coachCopy}</p>
                    <strong>Verified calculation</strong>
                    <p>{coach.baseline}</p>
                    <p>{coach.nextAction}</p>
                    <small>
                      AI observations are interpretations of self-reported
                      records, not verified bank facts. The calculation above
                      remains authoritative.
                    </small>
                    <details>
                      <summary>
                        Memory evidence ({coach.evidence.length})
                      </summary>
                      {coach.evidence.length ? (
                        coach.evidence.map((e, index) => (
                          <article className="memory-evidence" key={e.id}>
                            <code>
                              Evidence {index + 1} · {e.id}
                            </code>
                            <p>{e.text}</p>
                          </article>
                        ))
                      ) : (
                        <p>No AI memories were used.</p>
                      )}
                    </details>
                  </div>
                )}
              </section>
              <section className="card">
                <h2>Evidence starts with your ledger.</h2>
                <p>
                  Income and expenses have dates and categories. Budgets and
                  goals are intentions. Goal contributions record allocations,
                  not a second expense.
                </p>
                <ul className="coach-principles">
                  <li>
                    No provider requests on page load, edits or the memory
                    toggle.
                  </li>
                  <li>
                    Memory OFF makes no provider calls and infers no historical
                    behavior.
                  </li>
                  <li>
                    Partial months are not evidence of a change in full-month
                    habits.
                  </li>
                  <li>
                    No account syncing, bank connections, transfers or
                    investments.
                  </li>
                </ul>
                <p className="personal-disclosure">
                  These are switchable fictional demo accounts, not production
                  identity verification. Your session controls which personal
                  ledger and bank are accessible.
                </p>
              </section>
            </div>
          )}
        </>
      )}
      {editor && (
        <div className="personal-dialog-host">
          <dialog
            ref={dialogRef}
            onCancel={(e) => {
              e.preventDefault();
              if (!busy) setEditor(undefined);
            }}
            className="personal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="personal-editor-title"
          >
            <div className="personal-card-head">
              <h2 id="personal-editor-title">
                {editor.kind === "transaction"
                  ? editor.value
                    ? "Edit entry"
                    : "Add confirmed entry"
                  : editor.kind === "goal"
                    ? editor.value
                      ? "Edit savings goal"
                      : "New savings goal"
                    : editor.kind === "budget"
                      ? "Monthly category budget"
                      : "Record goal contribution"}
              </h2>
              <button
                aria-label="Close editor"
                disabled={busy}
                onClick={() => setEditor(undefined)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submit}>
              {editor.kind === "transaction" && (
                <label>
                  Entry type
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as typeof type)}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </label>
              )}
              {editor.kind === "goal" && (
                <label>
                  Goal name
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={70}
                    defaultValue={editor.value?.name}
                  />
                </label>
              )}
              {(editor.kind === "transaction" || editor.kind === "budget") && (
                <label>
                  Category
                  <select
                    name="category"
                    key={type}
                    defaultValue={editor.value?.category}
                  >
                    {(editor.kind === "budget" || type === "expense"
                      ? expenseCategories
                      : incomeCategories
                    ).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                {editor.kind === "goal"
                  ? "Target"
                  : editor.kind === "budget"
                    ? `Limit for ${month}`
                    : "Amount"}{" "}
                (₹)
                <input
                  name="amount"
                  inputMode="decimal"
                  type="number"
                  required
                  min={editor.kind === "budget" ? "0" : "0.01"}
                  step="0.01"
                  max="100000000"
                  defaultValue={
                    editor.kind === "transaction"
                      ? editor.value
                        ? editor.value.amount / 100
                        : undefined
                      : editor.kind === "goal"
                        ? editor.value
                          ? editor.value.target / 100
                          : undefined
                        : editor.kind === "budget"
                          ? editor.value
                            ? editor.value.limit / 100
                            : undefined
                          : undefined
                  }
                />
              </label>
              {(editor.kind === "transaction" ||
                editor.kind === "contribution") && (
                <>
                  <label>
                    Date
                    <input
                      name="date"
                      type="date"
                      max={today}
                      required
                      defaultValue={
                        editor.kind === "transaction"
                          ? editor.value?.date || today
                          : today
                      }
                    />
                  </label>
                  <label>
                    Note (optional)
                    <textarea
                      name="note"
                      maxLength={300}
                      defaultValue={
                        editor.kind === "transaction"
                          ? editor.value?.note
                          : undefined
                      }
                    />
                  </label>
                  <label className="consent-line">
                    <input name="confirmed" type="checkbox" required />I confirm
                    this{" "}
                    {editor.kind === "contribution"
                      ? "allocation; no money will move"
                      : "income or expense occurred"}
                    .
                  </label>
                </>
              )}
              {editor.kind === "goal" && (
                <label>
                  Target date (optional)
                  <input
                    name="due"
                    type="date"
                    defaultValue={editor.value?.due}
                  />
                </label>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="primary" disabled={busy} type="submit">
                {busy ? "Saving…" : "Save locally"}
              </button>
              <p className="personal-disclosure">
                Local save only. No data is sent to Hindsight by this action.
              </p>
            </form>
          </dialog>
        </div>
      )}
    </section>
  );
}
