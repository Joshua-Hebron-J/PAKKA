import { currentUser, sameOrigin, failure } from "@/lib/http";
import { read, authorize, users } from "@/lib/store";
import { politeReminder } from "@/lib/advice";
import { z } from "zod";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await currentUser();
    const { id } = z
      .object({ id: z.string().min(1).max(100) })
      .parse(await req.json());
    const d = read().find((d) => d.id === id);
    authorize(d, user);
    return Response.json({
      text: politeReminder(
        d,
        users.find((u) => u.id === d.lender)?.name || "Your counterparty",
        users.find((u) => u.id === d.borrower)?.name || "there",
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
