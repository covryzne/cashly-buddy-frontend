import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";
import { backend, verifiedSession } from "@/lib/auth/server";

export async function GET(request: Request) {
  const jar = await cookies();
  let status = "failed";
  try {
    const pending = JSON.parse(jar.get("cashly-google-link")?.value ?? "null");
    const params = new URL(request.url).searchParams;
    const code = params.get("code");
    if (!pending || typeof pending.email !== "string" || typeof pending.expiresAt !== "number" || pending.expiresAt <= Date.now() || pending.expiresAt > Date.now() + 300000 || !code || params.has("error")) throw new Error("Link context expired");
    const before = await verifiedSession(true);
    if (!before || before.user.id !== pending.userId || before.user.email?.toLowerCase() !== pending.email.toLowerCase()) throw new Error("Session changed");
    const { error } = await before.supabase.auth.exchangeCodeForSession(code);
    if (error) throw new Error("Invalid PKCE code");
    const after = await verifiedSession(true);
    if (!after || after.user.id !== before.user.id) {
      try { await before.supabase.auth.signOut({ scope: "local" }); }
      finally { for (const cookie of jar.getAll()) if (cookie.name.startsWith("sb-")) jar.set(cookie.name, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: authConfig().site.startsWith("https:") }); }
      throw new Error("Identity changed");
    }
    const google = after.user.identities?.find(identity => identity.provider === "google");
    if (!google) throw new Error("Google identity missing");
    const email = google.identity_data?.email;
    if (typeof email !== "string" || email.toLowerCase() !== pending.email.toLowerCase() || google.identity_data?.email_verified !== true || after.user.email?.toLowerCase() !== pending.email.toLowerCase()) {
      // Only the Google identity from this originally-disconnected account is
      // removed; never merge accounts or unlink the existing email identity.
      const cleanup = await after.supabase.auth.unlinkIdentity(google);
      status = cleanup.error ? "cleanup_failed" : "mismatch";
    } else {
      const account = await backend("/me", after.token);
      if (!account.ok) throw new Error("Account unavailable");
      status = "connected";
    }
  } catch {
    // Provider details, code, tokens and email never enter a redirect URL or log.
  }
  jar.set("cashly-google-link", "", { path: "/auth/google/connect", httpOnly: true, maxAge: 0, sameSite: "lax", secure: authConfig().site.startsWith("https:") });
  return NextResponse.redirect(`${authConfig().site}/profil?google_link=${status}`, { status: 303, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
