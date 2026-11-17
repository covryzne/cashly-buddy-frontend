import "server-only";
import { z } from "zod";
import { authConfig, sameOrigin } from "./config";

const headers = { "Cache-Control": "private, no-store" };
const email = z.string().trim().email().max(254);
export async function verificationAction(request: Request, mode: "verify" | "resend") {
  const fail = (error: string, status: number) => Response.json({ error }, { status, headers });
  try {
    if (!sameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 2048) return fail("Form terlalu besar.", 413);
    const schema = mode === "verify" ? z.object({ email, token: z.string().regex(/^[0-9]{6}$/) }).strict() : z.object({ email }).strict();
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return fail("Form tidak valid.", 400); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("Periksa email dan kode enam digit.", 422);
    const result = await fetch(`${authConfig().api}/api/v1/auth/email/${mode}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20000),
    });
    if (result.status === 429) return fail("Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.", 429);
    if (result.status >= 500) return fail("Layanan verifikasi belum tersedia. Coba lagi.", 503);
    if (!result.ok) return fail("Kode tidak valid atau kedaluwarsa. Coba lagi atau kirim ulang kode.", 400);
    return Response.json({ status: mode === "verify" ? "registered" : "verification_required" }, { status: result.status, headers });
  } catch { return fail("Layanan verifikasi belum dapat dihubungi.", 503); }
}
