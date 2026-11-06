import { currentUser, failure, sameOrigin } from "@/lib/http";
import { read, refresh, save } from "@/lib/store";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const cron =
      !!process.env.CRON_SECRET &&
      req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
    const user = cron ? null : await currentUser();
    const data = read();
    const scope = cron
      ? data
      : data.filter((d) => [d.lender, d.borrower].includes(user!));
    refresh(scope);
    save(data);
    return Response.json({ refreshed: scope.length });
  } catch (e) {
    return failure(e);
  }
}
