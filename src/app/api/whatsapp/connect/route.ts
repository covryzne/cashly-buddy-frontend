import { connection } from "next/server";
import { whatsappNumber } from "@/lib/format/whatsapp";

const headers = {
  "Cache-Control": "no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
};

export async function GET(request: Request) {
  await connection();
  // This value is only read on the server, at request time.
  const number = whatsappNumber(process.env.WHATSAPP_BOT_NUMBER);
  const configured = number !== null;
  if (new URL(request.url).searchParams.get("mode") === "availability") {
    return Response.json({ configured }, { headers });
  }
  if (!configured) {
    return Response.json(
      { message: "Chat WhatsApp belum tersedia. Silakan kembali ke Cashly." },
      { status: 503, headers },
    );
  }
  const target = new URL(`https://wa.me/${number}`);
  target.searchParams.set(
    "text",
    process.env.WHATSAPP_CONNECT_MESSAGE?.trim() ||
      "Halo Cashly, saya ingin meminta OTP untuk menghubungkan akun saya.",
  );
  return new Response(null, {
    status: 307,
    headers: { ...headers, Location: target.href },
  });
}
