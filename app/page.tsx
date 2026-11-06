"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  LayoutDashboard,
  Handshake,
  BrainCircuit,
  Bell,
  ArrowRight,
  Check,
  Wallet,
  LogOut,
  RefreshCw,
  X,
  ShieldCheck,
} from "lucide-react";
import { money, paise, installments, total } from "@/lib/finance";
import type { Debt, Terms } from "@/lib/store";
import AgreementTools from "./agreement-tools";
type ViewDebt = Debt & { balance: number };
type User = { id: string; name: string; initials: string; role: string };
type State = {
  userId: string | null;
  users: User[];
  debts: ViewDebt[];
  memoryConfigured?: boolean;
};
export default function Home() {
  const [state, setState] = useState<State>();
  const [tab, setTab] = useState("Overview");
  const [selected, setSelected] = useState<string>();
  const [form, setForm] = useState<"create" | "amend" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch("/api/state", { cache: "no-store" });
    if (!r.ok) throw Error("Could not load dashboard");
    setState(await r.json());
  }
  useEffect(() => {
    let cancelled = false;
    fetch("/api/state", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw Error("Could not load dashboard");
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setState(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function act(p: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      await load();
      setForm(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!state)
    return (
      <main className="loading">
        <div className="brand">
          p<span>·</span> PAKKA
        </div>
        <p>{error || "Getting your promises in order…"}</p>
        {error && <button onClick={() => location.reload()}>Retry</button>}
      </main>
    );
  if (!state.userId)
    return (
      <main className="signin">
        <div className="signin-story">
          <div className="brand">
            p<span>·</span> PAKKA
          </div>
          <div className="eyebrow">MONEY IS PERSONAL. KEEP IT THAT WAY.</div>
          <h1>
            Good friends.
            <br />
            Clear promises.
          </h1>
          <p>Every Rupee. Every Promise. Remembered.</p>
          <div className="orbit">
            <Handshake size={80} />
            <span>Clarity feels good.</span>
          </div>
        </div>
        <div className="signin-panel">
          <span className="pill">INTERACTIVE DEMO</span>
          <h2>
            A little trust.
            <br />A lot of clarity.
          </h2>
          <p>
            Choose a demo account to explore your shared agreements. Each
            sign-in creates a secure server session.
          </p>
          {state.users.map((u) => (
            <button
              className="user-choice"
              disabled={busy}
              key={u.id}
              onClick={() => act({ action: "signin", userId: u.id })}
            >
              <span className="avatar">{u.initials}</span>
              <span>
                <strong>{u.name}</strong>
                <small>{u.role}</small>
              </span>
              <ArrowRight />
            </button>
          ))}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <small className="muted">
            Demo access only. Both accounts are available to everyone using this
            local app.
          </small>
        </div>
      </main>
    );
  const me = state.users.find((u) => u.id === state.userId)!;
  const other = state.users.find((u) => u.id !== me.id)!;
  const active = state.debts.filter((d) => d.status === "accepted");
  const lent = active
    .filter((d) => d.lender === me.id)
    .reduce((s, d) => s + d.balance, 0);
  const owed = active
    .filter((d) => d.borrower === me.id)
    .reduce((s, d) => s + d.balance, 0);
  const due = active
    .filter((d) => d.alert === "due soon")
    .reduce((s, d) => s + d.balance, 0);
  const overdue = active
    .filter((d) => d.alert === "overdue")
    .reduce((s, d) => s + d.balance, 0);
  const d = state.debts.find((x) => x.id === selected);
  const activities = state.debts
    .flatMap((d) =>
      d.events.map((e) => ({ ...e, title: d.title, debtId: d.id })),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          p<span>·</span> PAKKA
        </div>
        <small className="sidebar-caption">A LITTLE CLARITY, EVERY DAY</small>
        <nav>
          {[
            ["Overview", LayoutDashboard],
            ["Agreements", Handshake],
            ["Memory", BrainCircuit],
            ["Reminders", Bell],
          ].map(([name, Icon]) => {
            const I = Icon as typeof Wallet;
            return (
              <button
                key={name as string}
                className={tab === name ? "nav active" : "nav"}
                onClick={() => {
                  setTab(name as string);
                  setSelected(undefined);
                }}
              >
                <I size={19} />
                {name as string}
                {name === "Reminders" && (
                  <b>{active.filter((d) => d.alert).length}</b>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={24} />
          <strong>Built on mutual trust.</strong>
          <p>
            Clear terms. Shared records.
            <br />
            No awkward guesswork.
          </p>
        </div>
        <div className="profile">
          <span className="avatar">{me.initials}</span>
          <div>
            <strong>{me.name}</strong>
            <small>Demo account</small>
          </div>
          <button
            aria-label="Sign out"
            disabled={busy}
            onClick={() => act({ action: "signout" })}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <main className="workspace">
        <header>
          <div className="breadcrumb">
            Your space <span>/</span> <strong>{tab}</strong>
          </div>
          <div className="header-right">
            <button
              className="mobile-signout"
              aria-label="Switch demo account"
              disabled={busy}
              onClick={() => act({ action: "signout" })}
            >
              <LogOut size={17} />
            </button>
            <span className="demo-tag">DEMO MODE</span>
            <button aria-label="Reminders" onClick={() => setTab("Reminders")}>
              <Bell size={19} />
            </button>
            <span className="avatar small">{me.initials}</span>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">A CLEARER PICTURE</div>
              <h1>
                {tab === "Overview"
                  ? `Hey, ${me.name.split(" ")[0]}. All accounted for.`
                  : tab === "Memory"
                    ? "Some things deserve to be remembered."
                    : tab === "Reminders"
                      ? "A gentle nudge goes a long way."
                      : "Every agreement, in one place."}
              </h1>
              <p>Less keeping track. More peace of mind.</p>
            </div>
            <button
              className="primary"
              disabled={busy}
              onClick={() => {
                setForm("create");
                setSelected(undefined);
              }}
            >
              <Plus size={18} /> New agreement
            </button>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {tab === "Overview" && !d && (
            <>
              <div className="stats">
                <div className="stat featured">
                  <div>
                    <span>Total lent</span>
                    <ArrowUpRight size={20} />
                  </div>
                  <h2>{money(lent)}</h2>
                  <small>Goodwill, with a clear record</small>
                  <div className="sparkline">▁ ▂ ▂ ▃ ▂ ▄ ▄ ▅ ▄ ▆ ▅ ▇ ▆ █</div>
                </div>
                <div className="stat">
                  <div>
                    <span>Total owed</span>
                    <ArrowDownLeft size={20} />
                  </div>
                  <h2>{money(owed)}</h2>
                  <small>Your outstanding commitments</small>
                </div>
                <div className="stat">
                  <div>
                    <span>Due in 7 days</span>
                    <Bell size={19} />
                  </div>
                  <h2>{money(due)}</h2>
                  <small>
                    {active.filter((d) => d.alert === "due soon").length}{" "}
                    agreement(s) coming up
                  </small>
                </div>
                <div className="stat">
                  <div>
                    <span>Overdue</span>
                    <span className="dot amber" />
                  </div>
                  <h2>{money(overdue)}</h2>
                  <small>A good time to check in</small>
                </div>
              </div>
              <div className="banner">
                <span className="banner-icon">
                  <BrainCircuit />
                </span>
                <div>
                  <strong>A memory for your money.</strong>
                  <p>
                    Context from confirmed events, so the next conversation
                    starts with clarity.
                  </p>
                </div>
                <button onClick={() => setTab("Memory")}>
                  Explore memory <ArrowRight size={17} />
                </button>
              </div>
            </>
          )}
          {form && (
            <section className="card">
              <div className="section-title">
                <h2>
                  {form === "create"
                    ? "Make a clear promise"
                    : "Propose an amendment"}
                </h2>
                <button aria-label="Close form" onClick={() => setForm(null)}>
                  <X />
                </button>
              </div>
              <AgreementForm
                initial={form === "amend" ? d?.terms : undefined}
                busy={busy}
                onSubmit={(title, terms) =>
                  act(
                    form === "create"
                      ? { action: "create", title, terms }
                      : { action: "amend", id: d?.id, terms },
                  )
                }
              />
            </section>
          )}
          {d ? (
            <section className="card detail">
              <button
                className="text-button"
                onClick={() => {
                  setSelected(undefined);
                }}
              >
                ← All agreements
              </button>
              <div className="section-title">
                <h2>{d.title}</h2>
                <span className="pill">{d.status}</span>
              </div>
              <h1>
                {money(d.balance)} <small>remaining</small>
              </h1>
              <p>
                {d.lender === me.id ? "You lent to" : "You borrowed from"}{" "}
                {other.name} · Due {d.terms.due}
              </p>
              <div className="terms">
                <span>
                  Principal <strong>{money(d.terms.principal)}</strong>
                </span>
                <span>
                  Annual simple rate{" "}
                  <strong>{(d.terms.bps / 100).toFixed(2)}% p.a.</strong>
                </span>
                <span>
                  Start <strong>{d.terms.start}</strong>
                </span>
                <span>
                  Total payable{" "}
                  <strong>
                    {money(
                      total(
                        d.terms.principal,
                        d.terms.bps,
                        d.terms.start,
                        d.terms.due,
                      ),
                    )}
                  </strong>
                </span>
              </div>
              <p className="terms-note">{d.terms.note}</p>
              <small className="muted">
                Actual/365 simple interest, fixed through the due date; no
                compounding or late fees. Equal installments split the fixed
                total across evenly spaced dates.
              </small>
              <div className="schedule">
                {installments(
                  total(
                    d.terms.principal,
                    d.terms.bps,
                    d.terms.start,
                    d.terms.due,
                  ),
                  d.terms.count,
                ).map((n, i) => (
                  <span key={i}>
                    Installment {i + 1} <strong>{money(n)}</strong>
                    <small>
                      {scheduleDate(
                        d.terms.start,
                        d.terms.due,
                        d.terms.count,
                        i,
                      )}
                    </small>
                  </span>
                ))}
              </div>
              {d.status === "pending" && d.borrower === me.id && (
                <div className="actions">
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => act({ action: "accept", id: d.id })}
                  >
                    <Check size={16} /> Accept terms
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => act({ action: "reject", id: d.id })}
                  >
                    Reject
                  </button>
                </div>
              )}
              {d.status === "pending" && d.lender === me.id && (
                <p className="callout">
                  Waiting for {other.name.split(" ")[0]} to accept. Sign out and
                  choose their demo account to respond.
                </p>
              )}
              {d.status === "accepted" && (
                <>
                  <form
                    className="payment-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      try {
                        void act({
                          action: "payment",
                          id: d.id,
                          amount: paise(String(f.get("amount"))),
                        });
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <label>
                      Report a repayment (₹)
                      <input
                        required
                        name="amount"
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                    </label>
                    <button
                      className="primary"
                      disabled={busy || d.balance === 0}
                    >
                      Report payment
                    </button>
                  </form>
                  <small className="muted">
                    Your counterparty must confirm. Reporting a payment does not
                    move money.
                  </small>
                  <p>
                    <button disabled={busy} onClick={() => setForm("amend")}>
                      Propose amended terms
                    </button>
                  </p>
                </>
              )}
              {d.amendment && (
                <div className="callout">
                  <strong>Amendment awaiting mutual approval</strong>
                  <p>
                    {money(d.amendment.terms.principal)} ·{" "}
                    {d.amendment.terms.bps / 100}% p.a. · Due{" "}
                    {d.amendment.terms.due} · {d.amendment.terms.count}{" "}
                    installments · Start {d.amendment.terms.start}
                  </p>
                  <p>{d.amendment.terms.note}</p>
                  {d.amendment.by !== me.id && (
                    <div className="actions">
                      <button
                        disabled={busy}
                        onClick={() =>
                          act({ action: "approve-amendment", id: d.id })
                        }
                      >
                        Approve amendment
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          act({ action: "reject-amendment", id: d.id })
                        }
                      >
                        Reject amendment
                      </button>
                    </div>
                  )}
                </div>
              )}
              <h3>Payment ledger</h3>
              {!d.payments.length && (
                <p className="muted">
                  No payments yet. Your first confirmed repayment will appear
                  here.
                </p>
              )}
              {d.payments.map((p) => (
                <div className="ledger-row" key={p.id}>
                  <div>
                    <strong>{money(p.amount)}</strong>
                    <small>
                      {p.date} · Reported by {p.by}
                    </small>
                  </div>
                  <span className={`pill ${p.status}`}>{p.status}</span>
                  {p.status === "pending" && p.by !== me.id && (
                    <div className="actions">
                      <button
                        disabled={busy}
                        onClick={() =>
                          act({ action: "confirm", id: d.id, paymentId: p.id })
                        }
                      >
                        Confirm
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          act({ action: "dispute", id: d.id, paymentId: p.id })
                        }
                      >
                        Dispute
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <AgreementTools
                key={`${d.id}-${me.id}-${d.events.at(-1)?.id}`}
                d={d}
                userId={me.id}
                onAction={act}
                busy={busy}
              />
            </section>
          ) : tab === "Memory" ? (
            <section className="card memory-intro">
              <BrainCircuit size={40} />
              <h2>Remember the context. Respect the facts.</h2>
              <p>
                Hindsight remembers verified events and clearly labeled borrower
                intentions in a separate bank for each agreement. Recall finds
                evidence; reflect summarizes outcomes. Nothing changes your
                agreed terms.
              </p>
              <span className="pill">
                {state.memoryConfigured
                  ? "Credentials configured · request to verify"
                  : "Not connected"}
              </span>
              <p>Select an agreement to compare memory on and off.</p>
              {state.debts.map((d) => (
                <button key={d.id} onClick={() => setSelected(d.id)}>
                  {d.title} <ArrowRight size={16} />
                </button>
              ))}
            </section>
          ) : tab === "Reminders" ? (
            <section className="card">
              <div className="section-title">
                <h2>Your reminders</h2>
                <button
                  disabled={busy}
                  onClick={() => act({ action: "refresh" })}
                >
                  <RefreshCw size={16} /> Refresh reminders
                </button>
              </div>
              <p className="muted">
                Calculated from final due dates in UTC. In-app only; refresh
                manually or configure the cron endpoint.
              </p>
              {active
                .filter((d) => d.alert)
                .map((d) => (
                  <button
                    className="reminder-row"
                    key={d.id}
                    onClick={() => setSelected(d.id)}
                  >
                    <Bell />
                    <div>
                      <strong>{d.title}</strong>
                      <small>
                        Due {d.terms.due} · {money(d.balance)}
                      </small>
                    </div>
                    <span className="pill overdue">{d.alert}</span>
                  </button>
                ))}
              {!active.some((d) => d.alert) && (
                <p>All clear. No due-soon or overdue agreements.</p>
              )}
            </section>
          ) : (
            <div className={tab === "Overview" ? "two-columns" : ""}>
              <section className="card">
                <div className="section-title">
                  <h2>
                    Your agreements{" "}
                    <span className="count">{state.debts.length}</span>
                  </h2>
                  <button
                    className="text-button"
                    onClick={() =>
                      setTab(tab === "Overview" ? "Agreements" : "Overview")
                    }
                  >
                    {tab === "Overview" ? "View all" : "Overview"}{" "}
                    <ArrowRight size={15} />
                  </button>
                </div>
                <div className="list-label">
                  <span>PEOPLE & PROMISES</span>
                  <span>BALANCE</span>
                </div>
                {state.debts.map((d) => (
                  <button
                    className="debt-row"
                    key={d.id}
                    onClick={() => {
                      setSelected(d.id);
                    }}
                  >
                    <span
                      className={`debt-icon ${d.lender === me.id ? "lent" : "owed"}`}
                    >
                      {d.lender === me.id ? (
                        <ArrowUpRight size={22} />
                      ) : (
                        <ArrowDownLeft size={22} />
                      )}
                    </span>
                    <div className="debt-name">
                      <strong>{d.title}</strong>
                      <small>
                        {other.name} <span>·</span>{" "}
                        {d.lender === me.id ? "You lent" : "You borrowed"}
                      </small>
                      <span
                        className={`pill ${d.alert === "overdue" ? "overdue" : ""}`}
                      >
                        {d.status === "pending"
                          ? "Awaiting acceptance"
                          : d.status === "rejected"
                            ? "Rejected"
                            : d.balance === 0
                              ? "Settled"
                              : d.alert || "On track"}
                      </span>
                    </div>
                    <div className="debt-amount">
                      <strong>{money(d.balance)}</strong>
                      <small>
                        Due{" "}
                        {new Date(d.terms.due + "T00:00:00").toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short" },
                        )}
                      </small>
                    </div>
                  </button>
                ))}
                {!state.debts.length && (
                  <p className="empty">
                    Your next promise starts here. Create your first agreement.
                  </p>
                )}
                <div className="card-foot">
                  <ShieldCheck size={15} /> Shared records. Both sides, always
                  in the loop.
                </div>
              </section>
              {tab === "Overview" && !d && (
                <section className="card activity">
                  <div className="section-title">
                    <h2>Recent activity</h2>
                    <span className="live-dot">● Ledger</span>
                  </div>
                  {activities.slice(0, 5).map((e) => (
                    <button
                      className="activity-row"
                      key={e.id}
                      onClick={() => setSelected(e.debtId)}
                    >
                      <span
                        className={`activity-icon ${e.verified ? "verified" : ""}`}
                      >
                        {e.verified ? (
                          <Check size={16} />
                        ) : (
                          <Handshake size={16} />
                        )}
                      </span>
                      <div>
                        <strong>
                          {e.kind === "confirmed"
                            ? "Payment confirmed"
                            : e.kind === "accepted"
                              ? "A promise made"
                              : e.kind.replaceAll("-", " ")}
                        </strong>
                        <p>{e.title}</p>
                        <small>
                          {new Date(e.at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          ·{" "}
                          {e.verified
                            ? "Verified"
                            : e.memoryEligible
                              ? "Borrower intention"
                              : "Unconfirmed action"}
                        </small>
                      </div>
                    </button>
                  ))}
                  <div className="activity-footer">
                    Little steps. Promises kept.
                  </div>
                </section>
              )}
            </div>
          )}
          <footer>
            <span className="footer-brand">PAKKA</span> Every Rupee. Every
            Promise. Remembered.
            <span>
              Records support clarity; they do not prevent all fraud or
              guarantee legal enforceability.
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
function scheduleDate(
  start: string,
  due: string,
  count: number,
  index: number,
) {
  const end = Date.parse(due),
    begin = Date.parse(start);
  return new Date(begin + ((end - begin) * (index + 1)) / count)
    .toISOString()
    .slice(0, 10);
}
function AgreementForm({
  initial,
  busy,
  onSubmit,
}: {
  initial?: Terms;
  busy: boolean;
  onSubmit: (title: string, terms: Terms) => void;
}) {
  const [err, setErr] = useState("");
  return (
    <form
      className="agreement-form"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const f = new FormData(e.currentTarget);
          onSubmit(String(f.get("title")), {
            principal: paise(String(f.get("principal"))),
            bps: Math.round(Number(f.get("rate")) * 100),
            start: String(f.get("start")),
            due: String(f.get("due")),
            count: Number(f.get("count")),
            note: String(f.get("note")),
          });
          setErr("");
        } catch (e) {
          setErr((e as Error).message);
        }
      }}
    >
      <label>
        What is the promise for?
        <input
          name="title"
          required
          minLength={3}
          maxLength={100}
          defaultValue={initial ? "Amended agreement" : ""}
          placeholder="e.g. A new laptop"
        />
      </label>
      <div className="form-grid">
        <label>
          Principal (₹)
          <input
            name="principal"
            required
            inputMode="decimal"
            defaultValue={initial ? initial.principal / 100 : ""}
            placeholder="10,000.00"
          />
        </label>
        <label>
          Annual simple interest (%)
          <input
            name="rate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            defaultValue={initial ? initial.bps / 100 : 0}
            required
          />
        </label>
        <label>
          Start date
          <input
            name="start"
            type="date"
            required
            defaultValue={
              initial?.start || new Date().toISOString().slice(0, 10)
            }
          />
        </label>
        <label>
          Final due date
          <input name="due" type="date" required defaultValue={initial?.due} />
        </label>
        <label>
          Equal installments
          <input
            name="count"
            type="number"
            min="1"
            max="60"
            required
            defaultValue={initial?.count || 1}
          />
        </label>
      </div>
      <label>
        Clear terms
        <textarea
          name="note"
          required
          minLength={3}
          maxLength={1000}
          defaultValue={initial?.note}
          placeholder="Agree how and when repayment should happen."
        />
      </label>
      <small className="muted">
        Actual/365 simple annual interest. Equal installments divide the fixed
        total across evenly spaced dates; this is not a reducing-balance EMI
        loan. Dates and terms require mutual approval.
      </small>
      {err && <p className="error">{err}</p>}
      <button className="primary" disabled={busy}>
        Send for approval <ArrowRight size={16} />
      </button>
    </form>
  );
}
