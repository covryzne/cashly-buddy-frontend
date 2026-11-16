import { NextResponse } from "next/server";
import { authConfig, sameOrigin } from "@/lib/auth/config";
import { supabaseServer } from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return new Response(null, { status: 403 });
    const supabase = await supabaseServer(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google", options: {
        redirectTo: `${authConfig().site}/auth/callback`, skipBrowserRedirect: true,
        scopes: "openid email profile",
      },
    });
    if (error || !data.url) throw new Error("OAuth start failed");
    return NextResponse.redirect(data.url, { status: 303, headers: { "Cache-Control": "no-store" } });
  } catch {
    // Relative Location avoids trusting proxy/Host headers, even when config is missing.
    return new Response(null, { status: 303, headers: { Location: "/login?error=configuration", "Cache-Control": "no-store" } });
  }
}
