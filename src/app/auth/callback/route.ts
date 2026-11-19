import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";
import { backend, supabaseServer, verifiedSession } from "@/lib/auth/server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  // Never echo provider error descriptions or accept a browser-supplied redirect.
  try {
    const code = params.get("code");
    if (params.has("error") || !code) throw new Error("OAuth cancelled");
    const supabase = await supabaseServer(true);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw new Error("Invalid code");
    const session = await verifiedSession(true);
    if (!session) throw new Error("Invalid session");
    const response = await backend("/auth/bootstrap", session.token, "POST");
    return NextResponse.redirect(`${authConfig().site}${response.ok ? "/beranda" : "/auth/complete"}`, {
      status: 303, headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return new Response(null, { status: 303, headers: { Location: "/auth/complete?error=oauth", "Cache-Control": "no-store" } });
  }
}
