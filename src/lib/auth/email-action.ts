import "server-only";
import { z } from "zod";
import { authConfig, sameOrigin } from "./config";
import { supabaseServer } from "./server";
import { loginSchema } from "@/features/auth/login-schema";
import { registerSchema } from "@/features/auth/register-schema";

const headers = { "Cache-Control": "private, no-store" };
const fail = (error: string, status: number) => Response.json({ error }, { status, headers });
const authResult = z.object({ data: z.object({
  status: z.enum(["authenticated", "registered", "verification_required", "account_pending"]),
  session: z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1) }).nullable(),
}) });

export async function emailAction(request: Request, mode: "login" | "register") {
  try {
    if (!sameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 8192) return fail("Form terlalu besar.", 413);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return fail("Form tidak valid.", 400); }
    const parsed = (mode === "register" ? registerSchema : loginSchema).safeParse(body);
    if (!parsed.success) return fail("Periksa kembali email, nama, dan kata sandi.", 422);
    const credentials = mode === "register"
      ? { name: registerSchema.parse(body).name, email: parsed.data.email, password: parsed.data.password }
      : { email: parsed.data.email, password: parsed.data.password };
    const response = await fetch(`${authConfig().api}/api/v1/auth/${mode}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials), cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      if (response.status === 429) return fail("Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.", 429);
      if (response.status >= 500) return fail("Layanan autentikasi backend belum tersedia. Coba lagi.", 503);
      return fail(mode === "login" ? "Email atau kata sandi tidak sesuai." : "Akun belum dapat dibuat. Periksa isian atau masuk jika sudah terdaftar.", response.status);
    }
    const result = authResult.parse(await response.json()).data;
    if (mode === "register") {
      // Registration never installs an authenticated browser session.
      return Response.json({ status: result.status === "verification_required" ? "verification_required" : "registered" }, { status: response.status, headers });
    }
    if (result.status === "verification_required") {
      return Response.json({ status: "verification_required" }, { status: 202, headers });
    }
    if (!result.session) return fail("Sesi login tidak tersedia. Coba masuk kembali.", 503);
    const supabase = await supabaseServer(true);
    const { error } = await supabase.auth.setSession(result.session);
    if (error) return fail("Sesi login belum dapat disimpan. Coba masuk kembali.", 503);
    return Response.json({ redirect: result.status === "authenticated" ? "/beranda" : "/auth/complete" }, { headers });
  } catch {
    return fail("Tidak dapat menghubungi autentikasi backend. Pastikan backend berjalan.", 503);
  }
}
