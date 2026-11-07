import { z } from "zod";
import { currentUser, sameOrigin, failure } from "@/lib/http";
import { monthSchema } from "@/lib/personal";
import { readPersonal } from "@/lib/personal-store";
import { personalCoach, localCoach } from "@/lib/personal-memory";
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";
const input = z
  .object({
    month: monthSchema,
    enabled: z.boolean(),
    syncConfirmed: z.boolean(),
  })
  .strict()
  .refine(
    (p) => !p.enabled || p.syncConfirmed,
    "Explicit permission is required before syncing personal records",
  );
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await currentUser();
    const p = input.parse(await req.json());
    try {
      return Response.json(
        await personalCoach(user, p.month, p.enabled, p.syncConfirmed),
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      return Response.json(
        {
          ...localCoach(readPersonal(user), p.month),
          status: "offline",
          text: "Memory is unavailable or the ledger changed during sync. Retry explicitly when ready. Local calculations remain available.",
          evidence: [],
          recalled: [],
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch (e) {
    return failure(e);
  }
}
