import { currentUser, sameOrigin, failure } from "@/lib/http";
import {
  readPersonal,
  mutatePersonal,
  personalView,
} from "@/lib/personal-store";
import {
  monthlySummary,
  monthSchema,
  personalActionSchema,
} from "@/lib/personal";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const user = await currentUser();
    const { month } = z
      .object({ month: monthSchema })
      .strict()
      .parse(Object.fromEntries(new URL(req.url).searchParams));
    const data = readPersonal(user);
    return Response.json(
      {
        ledger: personalView(data),
        summary: monthlySummary(data, month),
        memoryConfigured: !!process.env.HINDSIGHT_API_KEY,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await currentUser();
    const p = personalActionSchema.parse(await req.json());
    mutatePersonal(user, p);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
