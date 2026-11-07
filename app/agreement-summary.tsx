"use client";
import {
  CalendarDays,
  Users,
  Coins,
  CheckCircle2,
  Wallet,
  ArrowUpRight,
} from "lucide-react";
import type { Debt } from "@/lib/store";
import { money, total } from "@/lib/finance";
export default function AgreementSummary({
  d,
  users,
  currentUserId,
  onOpen,
}: {
  d: Debt & { balance: number };
  users: { id: string; name: string }[];
  currentUserId: string;
  onOpen: () => void;
}) {
  const paid = d.payments
      .filter((p) => p.status === "confirmed")
      .reduce((s, p) => s + p.amount, 0),
    payable = total(d.terms.principal, d.terms.bps, d.terms.start, d.terms.due);
  return (
    <section className="agreement-summary card">
      <div className="summary-top">
        <span className="section-icon">
          <Users size={22} />
        </span>
        <div>
          <h2>{d.title}</h2>
          <p>
            with{" "}
            {users
              .filter(
                (u) =>
                  [d.borrower, d.lender].includes(u.id) &&
                  u.id !== currentUserId,
              )
              .map((u) => u.name.split(" ")[0])
              .join(" & ")}
          </p>
        </div>
        <span className={`pill ${d.balance === 0 ? "fulfilled" : "confirmed"}`}>
          {d.balance === 0 ? "Settled" : "Active"}
        </span>
      </div>
      <div className="summary-metrics">
        <div>
          <Coins />
          <span>Agreed principal</span>
          <strong>{money(d.terms.principal)}</strong>
        </div>
        <div>
          <CheckCircle2 />
          <span>Confirmed repaid</span>
          <strong>{money(paid)}</strong>
        </div>
        <div>
          <Wallet />
          <span>Outstanding</span>
          <strong>{money(d.balance)}</strong>
        </div>
      </div>
      <div
        className="repayment-progress"
        role="progressbar"
        aria-label="Confirmed repayment progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((paid / payable) * 100)}
      >
        <span style={{ width: `${Math.min(100, (paid / payable) * 100)}%` }} />
      </div>
      <div className="summary-bottom">
        <div>
          <CalendarDays />
          <span>
            Final due date
            <strong>
              {new Date(d.terms.due + "T00:00:00Z").toLocaleDateString(
                "en-IN",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                },
              )}
            </strong>
          </span>
        </div>
        <div>
          <Users />
          <span>
            Participants
            <strong>
              {users.find((u) => u.id === d.borrower)?.name || "Borrower"}{" "}
              (Borrower) ·{" "}
              {users.find((u) => u.id === d.lender)?.name || "Lender"} (Lender)
            </strong>
          </span>
        </div>
      </div>
      <button className="text-button summary-open" onClick={onOpen}>
        View agreement & ledger <ArrowUpRight size={15} />
      </button>
    </section>
  );
}
