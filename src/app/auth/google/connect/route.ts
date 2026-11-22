import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { providerConfig, sameOrigin } from "@/lib/auth/config";
import { verifiedSession } from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return new Response(null, { status: 403 });
    const session = await verifiedSession(true);
    if (!session) return new Response(null, { status: 303, headers: { Location: "/login?error=session", "Cache-Control": "no-store" } });
    const config = await providerConfig();
    if (!config.googleEnabled) throw new Error("Provider unavailable");
    if (session.user.identities?.some(identity => identity.provider === "google")) {
      return NextResponse.redirect(`${config.site}/profil?google_link=connected`, 303);
    }
    if (!session.user.email || !session.user.email_confirmed_at) throw new Error("Verified email required");
    const { data, error } = await session.supabase.auth.linkIdentity({ provider: "google", options: {
      redirectTo: `${config.site}/auth/google/connect/callback`, skipBrowserRedirect: true,
      scopes: "openid email profile", queryParams: { login_hint: session.user.email, prompt: "select_account" },
    } });
    if (error || !data.url) throw new Error("Linking unavailable");
    // This is context, not authorization: callback independently re-verifies the
    // signed-in user, provider email and PKCE code before trusting these values.
    (await cookies()).set("cashly-google-link", JSON.stringify({ userId: session.user.id, email: session.user.email, expiresAt: Date.now() + 300000 }), {
      httpOnly: true, sameSite: "lax", secure: config.site.startsWith("https:"), path: "/auth/google/connect", maxAge: 300,
    });
    return NextResponse.redirect(data.url, { status: 303, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return new Response(null, { status: 303, headers: { Location: "/profil?google_link=unavailable", "Cache-Control": "no-store" } });
  }
}
