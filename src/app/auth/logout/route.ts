import { sameOrigin } from "@/lib/auth/config";
import { supabaseServer } from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return new Response(null, { status: 403 });
    const supabase = await supabaseServer(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return Response.json({ error: "Logout belum selesai. Coba lagi." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Logout belum selesai. Coba lagi." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
