"use client";
import { useState, useRef } from "react";
import { BrainCircuit, Copy, Check, Bell } from "lucide-react";
import type { Debt } from "@/lib/store";
import { money, paise } from "@/lib/finance";
import { promiseStates } from "@/lib/promises";
import { repaymentSuggestion } from "@/lib/advice";
import { eventDescription } from "@/lib/timeline";
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
}: {
  d: Debt & { balance: number };
  userId: string;
  onAction: (p: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const [memory, setMemory] = useState(true),
    [insight, setInsight] = useState<Insight>(),
    [working, setWorking] = useState(false),
    [error, setError] = useState(""),
    [afford, setAfford] = useState(""),
    [reminder, setReminder] = useState(""),
    [copied, setCopied] = useState(false);
  const availableDateRef = useRef<HTMLInputElement>(null);
  const promises = promiseStates(d),
    facts = Array.from(
      new Map(
        [...(insight?.evidence || []), ...(insight?.recalled || [])].map(
          (f) => [f.id, f],
        ),
      ).values(),
    );
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
  return (
    <div className="agreement-tools" aria-busy={working}>
      <section className="tool-panel">
        <div className="section-title">
          <h3>Promise tracker</h3>
          <span className="pill intention">Borrower intentions</span>
        </div>
        <p className="muted">
          A promise does not change agreed terms or your balance. Only confirmed
          repayments reported after it was recorded count, allocated oldest
          promise first.
        </p>
        {promises.length === 0 ? (
          <p className="empty compact">No promises recorded yet.</p>
        ) : (
          promises.map((p) => (
            <div className="promise-row" key={p.id}>
              <div>
                <strong>
                  {money(p.amount)} by {p.date}
                </strong>
                <p>{p.note || "No note added."}</p>
                <small>
                  {money(p.paid)} confirmed toward this promise ·{" "}
                  {money(p.remaining)} remaining
                </small>
              </div>
              <span className={`pill ${p.status}`}>{p.status}</span>
              <details>
                <summary>Repayment evidence ({p.paymentIds.length})</summary>
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
          ))
        )}
        {userId === d.borrower && d.status === "accepted" && d.balance > 0 && (
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
        )}
      </section>
      <section className="tool-panel">
        <div className="section-title">
          <h3>
            <Bell size={18} /> A gentle reminder
          </h3>
          <button disabled={working || busy} onClick={copyReminder}>
            {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
            {copied ? "Copied" : "Copy Reminder"}
          </button>
        </div>
        <p className="muted">
          Uses the latest confirmed balance and agreed due date. Copies text
          only; PAKKA sends no external message.
        </p>
        {reminder && (
          <textarea
            aria-label="Reminder text"
            readOnly
            value={reminder}
            rows={4}
          />
        )}
        <span role="status" className="muted">
          {copied ? "Reminder copied to your clipboard." : ""}
        </span>
      </section>
      <section className="memory-box">
        <div className="section-title">
          <h3>
            <BrainCircuit size={20} /> Clearer next steps
          </h3>
          <label className="toggle">
            <input
              type="checkbox"
              disabled={working}
              checked={memory}
              onChange={(e) => {
                setMemory(e.target.checked);
                setInsight(undefined);
              }}
            />{" "}
            Memory {memory ? "on" : "off"}
          </label>
        </div>
        <div className="insight-summary">
          <div>
            <span>Confirmed balance</span>
            <strong>{money(d.balance)}</strong>
          </div>
          <div>
            <span>Agreed final due date</span>
            <strong>{d.terms.due}</strong>
          </div>
        </div>
        {userId === d.borrower && (
          <div className="affordability">
            <p>
              What can you comfortably repay? Optional, self-reported, used for
              this request only. No income is assumed or saved to memory.
            </p>
            <div className="form-grid">
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
                  placeholder="Enter an amount, including 0"
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
                  onChange={() => {
                    setInsight(undefined);
                  }}
                />
              </label>
            </div>
          </div>
        )}
        <button className="primary" disabled={working || busy} onClick={query}>
          {working ? "Checking…" : "Compare insights"}
        </button>
        {insight && (
          <>
            <span
              className={`pill ${insight.status === "connected" ? "confirmed" : "intention"}`}
              role="status"
            >
              {insight.status === "connected"
                ? "Live Hindsight"
                : insight.status.replaceAll("-", " ")}
            </span>
            <h4>Remembered history</h4>
            <p className="insight-text">{insight.text}</p>
            <h4>Advisory next action</h4>
            <p>{insight.summary?.nextAction || repaymentSuggestion(d).text}</p>
            <details className="evidence-panel">
              <summary>View evidence ({facts.length})</summary>
              {!facts.length ? (
                <p>
                  No AI memory evidence returned. The verified ledger remains
                  available below.
                </p>
              ) : (
                facts.map((f) => (
                  <blockquote key={f.id}>
                    {f.text}
                    <small>Memory ID: {f.id}</small>
                    {(f.metadata?.event_id || f.document_id) && (
                      <small>
                        Source event: {f.metadata?.event_id || f.document_id}
                      </small>
                    )}
                  </blockquote>
                ))
              )}
            </details>
          </>
        )}
        <p className="advisory-note">
          Suggestions are advisory. Nothing here submits a repayment or changes
          an agreement. Amendments require both participants to approve.
        </p>
      </section>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <section className="tool-panel timeline">
        <div className="section-title">
          <h3>AI memory timeline</h3>
          <span className="muted">Oldest to newest · UTC</span>
        </div>
        <p className="muted">
          Ledger events are the source of truth. AI memories are retrieved
          interpretations linked by source event, never new ledger events.
        </p>
        {events.length === 0 && <p>No agreement events yet.</p>}
        {events.map((e) => {
          const linked = facts.filter(
            (f) => (f.metadata?.event_id || f.document_id) === e.id,
          );
          return (
            <div className="history" key={e.id}>
              <span className={`dot ${e.verified ? "teal" : ""}`} />
              <div>
                <div className="timeline-label">
                  <strong>{e.kind.replaceAll("-", " ")}</strong>
                  <span
                    className={`pill ${e.verified ? "confirmed" : "intention"}`}
                  >
                    {e.verified
                      ? "Verified ledger event"
                      : e.kind === "promise-recorded"
                        ? "Borrower intention"
                        : "Unconfirmed action"}
                  </span>
                </div>
                <p>{eventDescription(e)}</p>
                <small>
                  {new Date(e.at).toISOString().replace("T", " ").slice(0, 19)}{" "}
                  UTC · {e.id}
                </small>
                {linked.length > 0 && (
                  <div className="memory-links">
                    <span>AI memory references</span>
                    {linked.map((f) => (
                      <small key={f.id}>{f.id}</small>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {unlinked.length > 0 && (
          <details className="evidence-panel">
            <summary>
              AI memories without a direct event link ({unlinked.length})
            </summary>
            <p>
              Retrieval is not a new ledger event. Some synthesized observations
              have no single source event or date.
            </p>
            {unlinked.map((f) => (
              <blockquote key={f.id}>
                {f.text}
                <small>Memory ID: {f.id}</small>
                {f.occurred_start && (
                  <small>Memory-reported date: {f.occurred_start}</small>
                )}
              </blockquote>
            ))}
          </details>
        )}
      </section>
    </div>
  );
}
