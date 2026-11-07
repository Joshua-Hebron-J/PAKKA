"use client";
import { useState } from "react";
import type { Debt } from "@/lib/store";
import { money, paise, total } from "@/lib/finance";
export default function AmountUpdates({
  debt: d,
  userId,
  busy,
  onAction,
}: {
  debt: Debt;
  userId: string;
  busy: boolean;
  onAction: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const pending = d.amountUpdates?.find(
    (r) => r.id === d.amendment?.amountUpdateId && r.status === "pending",
  );
  const pendingPayments = d.payments.some((p) => p.status === "pending");
  return (
    <section className="amount-updates" aria-label="Agreement amount updates">
      <h3>Agreement amount updates</h3>
      <p className="muted">
        The borrower can request a new principal amount. The lender must approve
        before terms or balance change. Confirmed repayments are preserved; the
        agreed rate and dates stay the same.
      </p>
      {d.status === "accepted" && d.borrower === userId && (
        <details key={pending?.id || d.amountUpdates?.length || 0}>
          <summary>Request amount update</summary>
          <form
            className="amount-update-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              const f = new FormData(e.currentTarget);
              try {
                await onAction({
                  action: "request-amount-update",
                  id: d.id,
                  amount: paise(String(f.get("amount"))),
                  reason: String(f.get("reason")),
                });
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <p>
              Current principal: <strong>{money(d.terms.principal)}</strong>
            </p>
            <label>
              Proposed agreement amount (₹)
              <input
                name="amount"
                inputMode="decimal"
                required
                maxLength={16}
                placeholder={(d.terms.principal / 100).toFixed(2)}
                disabled={busy || !!d.amendment || pendingPayments}
              />
            </label>
            <label>
              Reason
              <textarea
                name="reason"
                required
                maxLength={500}
                disabled={busy || !!d.amendment || pendingPayments}
              />
            </label>
            <button
              className="primary"
              disabled={busy || !!d.amendment || pendingPayments}
            >
              Submit amount request
            </button>
            {(d.amendment || pendingPayments) && (
              <small>
                Resolve the existing amendment or pending payments before
                requesting another change.
              </small>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </form>
        </details>
      )}
      {!d.amountUpdates?.length && (
        <p className="muted">No amount update requests yet.</p>
      )}
      {[...(d.amountUpdates || [])].reverse().map((r) => (
        <article key={r.id} className="amount-update-record">
          <div className="amount-update-title">
            <strong>
              {money(r.oldAmount)} → {money(r.proposedAmount)}
            </strong>
            <span
              className={`pill ${r.status === "approved" ? "confirmed" : r.status === "pending" ? "pending" : "disputed"}`}
            >
              {r.status[0].toUpperCase() + r.status.slice(1)}
            </span>
          </div>
          <small>Original principal → Proposed principal</small>
          {r.status === "approved" && (
            <p className="muted">
              Approved change recorded in the agreement audit and queued for the
              next explicit Hindsight insights sync.
            </p>
          )}
          <p>
            <strong>Reason:</strong> {r.reason}
          </p>
          <small>
            Requested {new Date(r.proposedAt).toLocaleString()}{" "}
            {r.resolvedAt
              ? `· ${r.status} ${new Date(r.resolvedAt).toLocaleString()}`
              : ""}
          </small>
          {r.status === "pending" && (
            <>
              <p>
                Original principal and balance stay active until lender
                approval.
              </p>
              {pending?.id === r.id && (
                <p>
                  Proposed total with existing interest:{" "}
                  <strong>
                    {money(
                      total(
                        r.proposedAmount,
                        d.terms.bps,
                        d.terms.start,
                        d.terms.due,
                      ),
                    )}
                  </strong>
                  . Latest repayments are rechecked on approval.
                </p>
              )}
              {d.lender === userId && pending?.id === r.id ? (
                <div className="actions">
                  <button
                    className="primary"
                    disabled={busy || pendingPayments}
                    onClick={() =>
                      onAction({
                        action: "approve-amendment",
                        id: d.id,
                        amendmentId: r.id,
                      })
                    }
                  >
                    Approve amount update
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      onAction({
                        action: "reject-amendment",
                        id: d.id,
                        amendmentId: r.id,
                      })
                    }
                  >
                    Reject amount update
                  </button>
                  {pendingPayments && (
                    <small>
                      Resolve pending payments before approval. You can still
                      reject.
                    </small>
                  )}
                </div>
              ) : (
                <small>Waiting for the lender to approve or reject.</small>
              )}
            </>
          )}
        </article>
      ))}
    </section>
  );
}
