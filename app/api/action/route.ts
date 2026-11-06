import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { actionSchema } from "@/lib/validation";
import { currentUser, failure, sameOrigin } from "@/lib/http";
import {
  read,
  save,
  session,
  logout,
  authorize,
  transition,
  refresh,
  Debt,
} from "@/lib/store";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const p = actionSchema.parse(await req.json());
    const jar = await cookies();
    if (p.action === "signin") {
      if (!p.userId) throw Error("Choose a demo user");
      const token = session(p.userId);
      jar.set("pakka_session", token, {
        httpOnly: true,
        sameSite: "strict",
        secure:
          process.env.NODE_ENV === "production" &&
          new URL(req.url).protocol === "https:",
        path: "/",
        maxAge: 86400,
      });
      return Response.json({ ok: true });
    }
    const user = await currentUser();
    if (p.action === "signout") {
      logout(jar.get("pakka_session")?.value || "");
      jar.delete("pakka_session");
      return Response.json({ ok: true });
    }
    const data = read();
    if (p.action === "create") {
      if (!p.terms || !p.title) throw Error("Complete the agreement");
      const d: Debt = {
        id: randomUUID(),
        title: p.title,
        lender: user,
        borrower: user === "asha" ? "rohan" : "asha",
        status: "pending",
        terms: p.terms,
        payments: [],
        events: [
          {
            id: randomUUID(),
            kind: "created",
            text: `${user} proposed an agreement`,
            at: new Date().toISOString(),
            verified: false,
          },
        ],
      };
      data.push(d);
    } else if (p.action === "refresh") {
      for (const d of data.filter((d) => [d.lender, d.borrower].includes(user)))
        refresh([d]);
    } else {
      const d = data.find((d) => d.id === p.id);
      authorize(d, user);
      transition(d, user, p.action, p);
    }
    save(data);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
