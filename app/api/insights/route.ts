import { currentUser, sameOrigin, failure } from "@/lib/http";
import { read, authorize } from "@/lib/store";
import { insights, localInsight } from "@/lib/hindsight";
import { insightSchema } from "@/lib/validation";
export const maxDuration = 300;
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await currentUser();
    const p = insightSchema.parse(await req.json());
    const d = read().find((d) => d.id === p.id);
    authorize(d, user);
    if (p.affordability && user !== d.borrower)
      throw Error("Only the borrower can provide their affordability");
    try {
      return Response.json(await insights(d, p.enabled, p.affordability));
    } catch {
      return Response.json({
        ...localInsight(d, p.affordability),
        status: "offline",
        text: "Memory service unavailable. Your verified ledger and local advisory remain available. Retry when connected.",
        evidence: [],
        recalled: [],
      });
    }
  } catch (e) {
    return failure(e);
  }
}
