export function paise(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw Error("Enter INR with at most two decimal places");
  const [r, p = ""] = value.split(".");
  const n = Number(r) * 100 + Number(p.padEnd(2, "0"));
  if (!Number.isSafeInteger(n) || n <= 0 || n > 10000000000)
    throw Error("Amount must be between ₹0.01 and ₹10 crore");
  return n;
}
export function interest(principal: number, bps: number, days: number): number {
  return Number(
    (BigInt(principal) * BigInt(bps) * BigInt(days) + 1825000n) / 3650000n,
  );
}
export function total(
  principal: number,
  bps: number,
  start: string,
  due: string,
): number {
  return (
    principal +
    interest(
      principal,
      bps,
      Math.max(0, Math.round((Date.parse(due) - Date.parse(start)) / 86400000)),
    )
  );
}
export function installments(amount: number, count: number): number[] {
  const base = Math.floor(amount / count);
  return Array.from(
    { length: count },
    (_, i) => base + (i < amount % count ? 1 : 0),
  );
}
export function money(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n / 100);
}
export function reminder(
  due: string,
  balance: number,
  now = new Date(),
): "overdue" | "due soon" | null {
  const days = Math.round(
    (Date.parse(due) - Date.parse(now.toISOString().slice(0, 10))) / 86400000,
  );
  return balance <= 0
    ? null
    : days < 0
      ? "overdue"
      : days <= 7
        ? "due soon"
        : null;
}
