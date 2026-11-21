import { supabaseServer } from "@/lib/auth/server";

function redirect(location: "/beranda" | "/login" | "/login?error=configuration") {
  // The browser resolves this path against its current host, including an HTTPS dev tunnel.
  return new Response(null, {
    status: 307,
    headers: { Location: location, "Cache-Control": "private, no-store" },
  });
}

export async function GET() {
  try {
    const supabase = await supabaseServer(true);
    const { data: { user }, error } = await supabase.auth.getUser();
    return redirect(user && !error ? "/beranda" : "/login");
  } catch {
    return redirect("/login?error=configuration");
  }
}
