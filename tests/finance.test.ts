import { describe, it, expect } from "vitest";
import { paise, interest, total, installments, reminder } from "../lib/finance";
describe("exact INR finance", () => {
  it("parses exact paise and rejects precision loss", () => {
    expect(paise("12.30")).toBe(1230);
    expect(() => paise("0.001")).toThrow();
    expect(() => paise("-1")).toThrow();
  });
  it("uses rounded annual simple interest without compounding", () => {
    expect(interest(100000, 1000, 365)).toBe(10000);
    expect(interest(100, 100, 1)).toBe(0);
    expect(interest(10000, 1000, 30)).toBe(82);
    expect(total(100000, 1000, "2026-01-01", "2027-01-01")).toBe(110000);
  });
  it("conserves paise across equal installments", () => {
    expect(installments(100, 3)).toEqual([34, 33, 33]);
    expect(installments(110000, 12).reduce((s, n) => s + n, 0)).toBe(110000);
  });
  it("generates deterministic final-due reminders", () => {
    const now = new Date("2026-11-05T23:00:00Z");
    expect(reminder("2026-11-04", 100, now)).toBe("overdue");
    expect(reminder("2026-11-12", 100, now)).toBe("due soon");
    expect(reminder("2026-11-13", 100, now)).toBe(null);
    expect(reminder("2026-11-04", 0, now)).toBe(null);
  });
});
