import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { providerConfig } from "@/lib/auth/config";

export async function proxy(request: NextRequest) {
  const openingApp = request.nextUrl.pathname === "/";
  let response = NextResponse.next({ request });
  const updates: { name: string; value: string; options: Parameters<typeof response.cookies.set>[2] }[] = [];
  const finish = (result: NextResponse) => {
    updates.forEach(({ name, value, options }) => result.cookies.set(name, value, options));
    result.headers.set("Cache-Control", "private, no-store");
    return result;
  };
  try {
    const config = await providerConfig();
    const supabase = createServerClient(config.supabase, config.key, {
      cookieOptions: { httpOnly: true, sameSite: "lax", secure: config.site.startsWith("https:"), path: "/" },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(10000) }) },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            request.cookies.set(name, value); updates.push({ name, value, options });
          });
          response = NextResponse.next({ request });
        },
      },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (openingApp) {
      return finish(NextResponse.redirect(new URL(user && !error ? "/beranda" : "/login", config.site)));
    }
    if (error || !user) return finish(NextResponse.redirect(new URL("/login?error=session", config.site)));
    return finish(response);
  } catch {
    return finish(new NextResponse(null, { status: 307, headers: { Location: "/login?error=configuration" } }));
  }
}

export const config = { matcher: ["/", "/beranda/:path*", "/aktivitas/:path*", "/laporan/:path*", "/profil/:path*"] };
