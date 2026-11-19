import { sameOrigin } from "@/lib/auth/config";
import { backend, verifiedSession } from "@/lib/auth/server";

export async function POST(request: Request) {
  let target = "/auth/complete?error=backend";
  try {
    if (!sameOrigin(request)) return new Response(null, { status: 403 });
    const session = await verifiedSession(true);
    if (!session) target = "/login?error=session";
    else if ((await backend("/auth/bootstrap", session.token, "POST")).ok) target = "/beranda";
  } catch { /* Session is retained so DB/provider outages can be retried. */ }
  return new Response(null, { status: 303, headers: { Location: target, "Cache-Control": "no-store" } });
}
