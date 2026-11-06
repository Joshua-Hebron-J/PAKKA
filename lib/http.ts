import { cookies } from "next/headers";
import { authenticate } from "./store";
export async function currentUser() {
  return authenticate((await cookies()).get("pakka_session")?.value);
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const url = new URL(req.url);
  // Next may normalize the internal URL to localhost; Host remains the browser origin.
  const expected = `${url.protocol}//${req.headers.get("host") || url.host}`;
  if (origin && origin !== expected) throw Error("Cross-origin request denied");
}
export function failure(e: unknown) {
  return Response.json(
    { error: e instanceof Error ? e.message : "Request failed" },
    { status: 400 },
  );
}
