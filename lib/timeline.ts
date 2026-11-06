import type { Event } from "./store";
import { money } from "./finance";
/** Presentation only: persisted audit records remain unchanged. */
export function eventDescription(e: Event): string {
  if (e.kind === "accepted" || e.kind === "amended") {
    const start = e.text.indexOf("{");
    if (start >= 0)
      try {
        const t = JSON.parse(e.text.slice(start));
        if (
          Number.isSafeInteger(t.principal) &&
          Number.isSafeInteger(t.bps) &&
          typeof t.due === "string"
        )
          return `${e.kind === "accepted" ? "Both parties accepted" : "Both parties approved amended terms"}: ${money(t.principal)}, ${(t.bps / 100).toFixed(2)}% annual simple interest, final due ${t.due}, ${t.count} installment(s). ${t.note}`;
      } catch {
        /* Historical free-text events stay readable as written. */
      }
  }
  return e.text.replace(/\b(\d+) paise\b/g, (original, value) =>
    Number.isSafeInteger(Number(value)) ? money(Number(value)) : original,
  );
}
