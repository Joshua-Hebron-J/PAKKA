import { currentUser } from "@/lib/http";
import { read, users, balance, refresh } from "@/lib/store";
import { promiseStates } from "@/lib/promises";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const userId = await currentUser();
    const all = read().filter((d) => [d.lender, d.borrower].includes(userId));
    refresh(all);
    return Response.json({
      userId,
      users,
      debts: all.map((d) => ({
        ...d,
        balance: balance(d),
        promiseStates: promiseStates(d),
      })),
      memoryConfigured: !!process.env.HINDSIGHT_API_KEY,
    });
  } catch {
    return Response.json({ userId: null, users, debts: [] });
  }
}
