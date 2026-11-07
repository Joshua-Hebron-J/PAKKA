"use client";
import { useState, useRef } from "react";
import {
  BrainCircuit,
  Copy,
  Check,
  Bell,
  CheckCircle2,
  Clock3,
  Flag,
  Sparkles,
  Coins,
  Lightbulb,
  Plus,
  History,
  ShieldCheck,
} from "lucide-react";
import type { Debt } from "@/lib/store";
import { money, paise } from "@/lib/finance";
import { promiseStates } from "@/lib/promises";
import { repaymentSuggestion } from "@/lib/advice";
import { eventDescription } from "@/lib/timeline";
const memoryCopy = (text: string) =>
  text.replace(/\b([\d,]+) paise\b/g, (original, value) => {
    const amount = Number(value.replaceAll(",", ""));
    return Number.isSafeInteger(amount) ? money(amount) : original;
  });

type Fact = {
  id: string;
  text: string;
  metadata?: { event_id?: string };
  document_id?: string;
  occurred_start?: string;
};
type Insight = {
  status: string;
  text: string;
  evidence: Fact[];
  recalled?: Fact[];
  summary?: { balance: number; due: string; nextAction: string };
  suggestion?: { text: string; amount: number | null; date: string | null };
};
export default function AgreementTools({
  d,
  userId,
  onAction,
  busy,
  section = "all",
}: {
  d: Debt & { balance: number };
  userId: string;
  onAction: (p: Record<string, unknown>) => Promise<void>;
  busy: boolean;
  section?: "all" | "promises" | "insights" | "timeline";
}) {
  const [memory, setMemory] = useState(true),
    [insight, setInsight] = useState<Insight>(),
    [working, setWorking] = useState(false),
    [error, setError] = useState(""),
    [afford, setAfford] = useState(""),
    [reminder, setReminder] = useState(""),
    [copied, setCopied] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState("all");
  const availableDateRef = useRef<HTMLInputElement>(null);
  const promises = promiseStates(d),
    facts = Array.from(
      new Map(
        [...(insight?.evidence || []), ...(insight?.recalled || [])].map(
          (f) => [f.id, f],
        ),
      ).values(),
    );
  const insightCopy = (text: string) =>
    memoryCopy(text).replace(/\[([^\]]+)\]/g, (original, refs) => {
      const indexes = refs
        .split(",")
        .map((id: string) => facts.findIndex((f) => f.id === id.trim()));
      return indexes.length && indexes.every((index: number) => index >= 0)
        ? `[${indexes.map((index: number) => index + 1).join(", ")}]`
        : original;
    });
  const events = [...d.events].sort((a, b) => a.at.localeCompare(b.at));
  const ids = new Set(events.map((e) => e.id)),
    unlinked = facts.filter(
      (f) => !ids.has(f.metadata?.event_id || f.document_id || ""),
    );
  async function query() {
    setWorking(true);
    setError("");
    setInsight(undefined);
    try {
      const affordability =
        afford !== ""
          ? {
              amount: /^0+(\.0{1,2})?$/.test(afford) ? 0 : paise(afford),
              date: availableDateRef.current?.value || "",
            }
          : undefined;
      const r = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: d.id, enabled: memory, affordability }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setInsight(data);
    } catch (e) {
      setError((e as Error).message);
      setInsight({
        status: "unavailable",
        text: "Could not load insights. Check the entered details or connection and retry. No historical claims are available.",
        evidence: [],
      });
    } finally {
      setWorking(false);
    }
  }
  async function copyReminder() {
    setWorking(true);
    setError("");
    setCopied(false);
    try {
      const r = await fetch("/api/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: d.id }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setReminder(data.text);
      try {
        await navigator.clipboard.writeText(data.text);
        setCopied(true);
      } catch {
        setError("Clipboard unavailable. Select and copy the reminder below.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  const show = (name: string) => section === "all" || section === name;
  const toggle = (
    <label className="memory-switch">
      <BrainCircuit size={17} />
      <span>
        Memory <span className="memory-provider">(Hindsight)</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-label="Memory"
        disabled={working}
        checked={memory}
        onChange={(e) => {
          setMemory(e.target.checked);
          setInsight(undefined);
        }}
      />
      <strong>{memory ? "ON" : "OFF"}</strong>
    </label>
  );
  return (
    <div className={`agreement-tools tools-${section}`} aria-busy={working}>
      {show("promises") && (
        <section className="tool-panel promises-panel">
          <div className="section-title">
            <h3>
              <CheckCircle2 size={22} /> Promise Tracker
            </h3>
            <span className="panel-count">
              {promises.length} {promises.length === 1 ? "promise" : "promises"}
            </span>
          </div>
          {promises.length === 0 ? (
            <div className="tool-empty">
              <Flag size={28} />
              <strong>A little intention goes a long way.</strong>
              <p>No promises recorded for this agreement yet.</p>
            </div>
          ) : (
            promises.map((p) => (
              <div className="promise-row" key={p.id}>
                <span className={`promise-icon ${p.status}`}>
                  {p.status === "fulfilled" ? (
                    <CheckCircle2 size={23} />
                  ) : (
                    <Clock3 size={23} />
                  )}
                </span>
                <div className="promise-main">
                  <strong>
                    Repay {money(p.amount)} by {p.date}
                  </strong>
                  <small>
                    Promised on{" "}
                    {new Date(p.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </small>
                  {p.note && <p>{p.note}</p>}
                  <details>
                    <summary>
                      Repayment evidence · {money(p.paid)} confirmed
                    </summary>
                    <p>{money(p.remaining)} remaining toward this intention.</p>
                    {p.paymentIds.length ? (
                      p.paymentIds.map((id) => (
                        <small className="evidence-id" key={id}>
                          Confirmed payment: {id}
                        </small>
                      ))
                    ) : (
                      <p>No qualifying confirmed repayment.</p>
                    )}
                  </details>
                </div>
                <span className={`pill ${p.status}`}>{p.status}</span>
              </div>
            ))
          )}
          {userId === d.borrower &&
            d.status === "accepted" &&
            d.balance > 0 && (
              <details className="promise-compose">
                <summary>
                  <Plus size={16} /> Record a promise
                </summary>
                <form
                  className="promise-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError("");
                    const form = e.currentTarget;
                    const data = new FormData(form);
                    try {
                      await onAction({
                        action: "promise",
                        id: d.id,
                        amount: paise(String(data.get("amount"))),
                        date: String(data.get("date")),
                        note: String(data.get("note")),
                      });
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <div className="form-grid">
                    <label>
                      Promise amount (₹)
                      <input
                        required
                        name="amount"
                        inputMode="decimal"
                        placeholder="e.g. 2500.00"
                      />
                    </label>
                    <label>
                      Promise date
                      <input
                        required
                        name="date"
                        type="date"
                        min={new Date().toISOString().slice(0, 10)}
                      />
                    </label>
                  </div>
                  <label>
                    Promise note (optional)
                    <input
                      name="note"
                      maxLength={500}
                      placeholder="A little context, if helpful"
                    />
                  </label>
                  <button disabled={busy || working}>Record promise</button>
                </form>
              </details>
            )}
          <p className="panel-footnote">
            <ShieldCheck size={13} /> Intentions only. Fulfillment uses
            confirmed repayments reported after recording, allocated oldest
            promise first.
          </p>
        </section>
      )}
      {show("insights") && (
        <>
          <section className="memory-box insights-panel">
            <div className="section-title">
              <h3>
                <Sparkles size={23} /> AI Insights
              </h3>
              <span className={`pill ${memory ? "confirmed" : "neutral"}`}>
                Memory: {memory ? "ON" : "OFF"}
              </span>
            </div>
            {insight ? (
              <>
                <span className="insight-status" role="status">
                  {insight.status === "connected"
                    ? "From your live Hindsight memory"
                    : insight.status.replaceAll("-", " ")}
                </span>
                <p className="insight-text">{insightCopy(insight.text)}</p>
              </>
            ) : (
              <div className="insight-placeholder">
                <span className="insight-orb">
                  <BrainCircuit size={27} />
                </span>
                <h4>
                  Remember the context.
                  <br />
                  Keep the facts clear.
                </h4>
                <p>
                  {memory
                    ? "Recall verified history and recorded intentions from this agreement. Insights appear only after a real request."
                    : "Memory is off. Compare using the current ledger, without retrieving history."}
                </p>
              </div>
            )}
            <div className="insight-actions">
              <button
                className="primary"
                disabled={working || busy}
                onClick={query}
              >
                {working ? "Recalling…" : "Compare insights"}
                <Sparkles size={15} />
              </button>
              {toggle}
            </div>
            <details className="evidence-panel">
              <summary>
                Show evidence <span>{facts.length}</span>
              </summary>
              {!facts.length ? (
                <p>
                  No AI evidence loaded. Your verified ledger remains the source
                  of truth.
                </p>
              ) : (
                facts.map((f) => (
                  <blockquote key={f.id}>
                    {memoryCopy(f.text)}
                    <small>
                      Evidence {facts.findIndex((item) => item.id === f.id) + 1}{" "}
                      · Memory ID: {f.id}
                    </small>
                    {(f.metadata?.event_id || f.document_id) && (
                      <small>
                        Source event: {f.metadata?.event_id || f.document_id}
                      </small>
                    )}
                  </blockquote>
                ))
              )}
            </details>
          </section>
          <section className="tool-panel suggestion-panel">
            <div className="section-title">
              <h3>
                <Coins size={23} /> Repayment Suggestion
              </h3>
              <span className="advisory-badge">ⓘ Advisory only</span>
            </div>
            <div className="suggestion-layout">
              <div className="affordability">
                {userId === d.borrower ? (
                  <>
                    <label>
                      I can afford (₹)
                      <input
                        inputMode="decimal"
                        value={afford}
                        disabled={working}
                        onChange={(e) => {
                          setAfford(e.target.value);
                          setInsight(undefined);
                        }}
                        placeholder="Enter an amount"
                      />
                    </label>
                    <label>
                      Available on
                      <input
                        type="date"
                        min={new Date().toISOString().slice(0, 10)}
                        ref={availableDateRef}
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        disabled={working}
                        onChange={() => setInsight(undefined)}
                      />
                    </label>
                    <button disabled={working || busy} onClick={query}>
                      {working ? "Checking…" : "Update suggestion"}
                    </button>
                  </>
                ) : (
                  <p>
                    Affordability is provided by the borrower. No income is
                    assumed.
                  </p>
                )}
              </div>
              <div className="suggestion-note">
                <span>
                  <Lightbulb size={16} /> A manageable next step
                </span>
                <p>
                  {insight?.summary?.nextAction || repaymentSuggestion(d).text}
                </p>
              </div>
            </div>
            <p className="panel-footnote">
              Request-only affordability. Nothing submits a payment or changes
              terms. Amendments need both approvals.
            </p>
          </section>
        </>
      )}
      {section === "all" && (
        <section className="tool-panel reminder-panel">
          <div className="section-title">
            <h3>
              <Bell size={21} /> A gentle nudge
            </h3>
            <button disabled={working || busy} onClick={copyReminder}>
              {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
              {copied ? "Copied" : "Copy Reminder"}
            </button>
          </div>
          <p>
            Polite words. The latest confirmed balance and agreed date. You
            choose when to send.
          </p>
          {reminder && (
            <textarea
              aria-label="Reminder text"
              readOnly
              value={reminder}
              rows={3}
            />
          )}
          <span role="status" className="panel-footnote">
            {copied
              ? "Copied to your clipboard. No message was sent."
              : "Copies text only. No automatic external messaging."}
          </span>
        </section>
      )}
      {error && (
        <div className="error tools-error" role="alert">
          {error}
        </div>
      )}
      {show("timeline") && (
        <section className="tool-panel timeline">
          <div className="section-title">
            <h3>
              <History size={22} /> Agreement Timeline
            </h3>
            <div className="timeline-filters" aria-label="Timeline filters">
              {[
                ["all", "All"],
                ["ledger", "Ledger events"],
                ["intentions", "Intentions"],
                ["ai", "AI memories"],
              ].map(([id, label]) => (
                <button
                  aria-pressed={timelineFilter === id}
                  className={timelineFilter === id ? "active" : ""}
                  key={id}
                  onClick={() => setTimelineFilter(id)}
                >
                  <span className={`filter-dot ${id}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          {section === "timeline" && (
            <div className="timeline-memory-controls">
              {toggle}
              <button disabled={working || busy} onClick={query}>
                {working ? "Recalling…" : "Recall supporting memories"}
              </button>
            </div>
          )}
          <p className="timeline-caption">
            Oldest to newest · UTC · Verified events, borrower intentions, and
            AI interpretations stay distinct.
          </p>
          {timelineFilter !== "ai" &&
            events
              .filter(
                (e) =>
                  timelineFilter === "all" ||
                  (timelineFilter === "ledger"
                    ? e.verified
                    : e.kind === "promise-recorded" || e.kind === "amendment"),
              )
              .map((e) => {
                const linked = facts.filter(
                  (f) => (f.metadata?.event_id || f.document_id) === e.id,
                );
                return (
                  <div
                    className={`history event-${e.verified ? "ledger" : "intention"}`}
                    key={e.id}
                  >
                    <div className="event-date">
                      <strong>
                        {new Date(e.at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </strong>
                      <span>
                        {new Date(e.at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "UTC",
                        })}
                      </span>
                    </div>
                    <span className="event-icon">
                      {e.verified ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <Flag size={20} />
                      )}
                    </span>
                    <div className="event-body">
                      <div className="timeline-label">
                        <strong>{e.kind.replaceAll("-", " ")}</strong>
                        <span
                          className={`pill ${e.verified ? "confirmed" : "intention"}`}
                        >
                          {e.verified
                            ? "Verified"
                            : e.kind === "promise-recorded"
                              ? "Promise"
                              : "Unconfirmed"}
                        </span>
                      </div>
                      <p>{eventDescription(e)}</p>
                      <details className="event-reference">
                        <summary>
                          Source & evidence
                          {linked.length
                            ? ` · ${linked.length} AI references`
                            : ""}
                        </summary>
                        <small>Ledger event: {e.id}</small>
                        {linked.map((f) => (
                          <small key={f.id}>AI memory: {f.id}</small>
                        ))}
                      </details>
                    </div>
                  </div>
                );
              })}
          {timelineFilter === "ai" &&
            (facts.length ? (
              facts.map((f) => (
                <div className="history ai-memory-row" key={f.id}>
                  <span className="event-icon">
                    <BrainCircuit size={20} />
                  </span>
                  <div className="event-body">
                    <div className="timeline-label">
                      <strong>AI Memory</strong>
                      <span className="pill memory">
                        Retrieved interpretation
                      </span>
                    </div>
                    <p>{memoryCopy(f.text)}</p>
                    <small>
                      Evidence {facts.findIndex((item) => item.id === f.id) + 1}{" "}
                      · Memory ID: {f.id}
                    </small>
                    {(f.metadata?.event_id || f.document_id) && (
                      <small>
                        Source event: {f.metadata?.event_id || f.document_id}
                      </small>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="tool-empty">
                <BrainCircuit size={28} />
                <strong>No memories loaded yet.</strong>
                <p>
                  Request an insight or recall supporting memories. Nothing here
                  is fabricated.
                </p>
              </div>
            ))}
          {events.length === 0 && timelineFilter !== "ai" && (
            <p className="empty">No agreement events yet.</p>
          )}
          {unlinked.length > 0 && timelineFilter === "all" && (
            <details className="evidence-panel">
              <summary>Synthesized AI observations · {unlinked.length}</summary>
              <p>
                These are retrieved interpretations, not new ledger events. Some
                have no single source date.
              </p>
              {unlinked.map((f) => (
                <blockquote key={f.id}>
                  {memoryCopy(f.text)}
                  <small>Memory ID: {f.id}</small>
                  {f.occurred_start && (
                    <small>Memory-reported date: {f.occurred_start}</small>
                  )}
                </blockquote>
              ))}
            </details>
          )}
        </section>
      )}
    </div>
  );
}
