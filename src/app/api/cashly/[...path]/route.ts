import { MAX_VOICE_REQUEST_BYTES } from "@/features/expenses/voice-limits";
import { verifiedSession } from "@/lib/auth/server";
import { authConfig, sameOrigin } from "@/lib/auth/config";
import { randomUUID } from "node:crypto";

const headers = {"Cache-Control":"private, no-store"};
type Context = {params: Promise<{path:string[]}>};
type Trace = { requestId: string; route: string; authMs: number; backendMs: number };
async function forward(request: Request, context: Context, trace: Trace) {
  try {
    if (request.method !== "GET" && !sameOrigin(request))
      return Response.json({error:{message:"Permintaan tidak diizinkan."}},{status:403,headers});
    const path = (await context.params).path.join("/");
    const allowed = /^(expenses(?:\/[0-9a-f-]{36}(?:\/restore)?)?|categories|me\/(?:preferences|profile|security\/(?:password\/(?:change|setup\/request)|google(?:\/disconnect)?))|gamification\/(overview|streak\/calendar|streak\/freeze|checkins\/(no-spend|review))|reports\/(summary|trend))$/;
    const whatsappAllowed = ((request.method === "GET" || request.method === "DELETE") && path === "me/whatsapp") ||
      (request.method === "GET" && path === "me/whatsapp/history") ||
      (request.method === "POST" && /^me\/whatsapp\/challenges(?:\/[0-9a-f-]{36}\/verify)?$/.test(path));
    if (!allowed.test(path) && !whatsappAllowed && !(request.method === "POST" && ["chat/extract", "receipts/extract", "voice/transcribe", "voice/extract", "expenses/chat-batch"].includes(path))) return Response.json({error:{message:"Endpoint tidak tersedia."}},{status:404,headers});
    trace.route = path.replace(/[0-9a-f-]{36}/g, ":id");
    const authStarted = performance.now();
    let session;
    try { session = await verifiedSession(true); }
    finally { trace.authMs = performance.now() - authStarted; }
    if (!session) return Response.json({error:{message:"Silakan login kembali."}},{status:401,headers});
    const limit = path === "receipts/extract" ? 4 * Math.ceil(10 * 1024 * 1024 / 3) + 65536 : path === "voice/transcribe" ? MAX_VOICE_REQUEST_BYTES : 65536;
    let body: string | undefined;
    if (request.method !== "GET") {
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) {
        try {
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            size += chunk.value.byteLength;
            if (size > limit) {
              await reader.cancel();
              return Response.json({error:{message:"Permintaan terlalu besar."}},{status:413,headers});
            }
            chunks.push(chunk.value);
          }
        } finally { reader.releaseLock(); }
      }
      body = Buffer.concat(chunks).toString("utf8");
    }
    if(request.method === "POST" && path === "me/security/password/setup/request") {
      const input=JSON.parse(body ?? "{}");
      if(typeof input!=="object" || input===null || Array.isArray(input) || Object.keys(input).length > 0) return Response.json({error:{message:"Permintaan tidak valid."}},{status:422,headers});
      body=JSON.stringify({...input,redirect_to:`${authConfig().site}/auth/password/callback`});
    }
    const upstreamStarted = performance.now();
    let upstream;
    try { upstream = await fetch(`${authConfig().api}/api/v1/${path}${new URL(request.url).search}`, {
      method: request.method, headers: {Authorization:`Bearer ${session.token}`,"Content-Type":"application/json",
        "Idempotency-Key":request.headers.get("Idempotency-Key") ?? "", "X-Request-ID": trace.requestId},
      body, cache:"no-store",redirect:"error",signal:AbortSignal.timeout(["chat/extract", "receipts/extract", "voice/transcribe", "voice/extract"].includes(path) ? 75000 : path.startsWith("me/security/") ? 45000 : 15000),
    }); } finally { trace.backendMs = performance.now() - upstreamStarted; }
    const responseBody = await upstream.text();
    trace.backendMs = performance.now() - upstreamStarted;
    return new Response(responseBody,{status:upstream.status,headers:{...headers,"Content-Type":"application/json",
      "Server-Timing": upstream.headers.get("Server-Timing") ?? "",
    }});
  } catch {
    return Response.json({error:{message:"Layanan Cashly belum dapat dihubungi."}},{status:503,headers});
  }
}
async function handle(request: Request, context: Context) {
  const started = performance.now();
  const trace: Trace = { requestId: randomUUID(), route: "unmatched", authMs: 0, backendMs: 0 };
  const response = await forward(request, context, trace);
  response.headers.set("X-Request-ID", trace.requestId);
  const timings = response.headers.get("Server-Timing");
  response.headers.set("Server-Timing", [
    `proxy_auth;dur=${trace.authMs.toFixed(1)}`, `backend;dur=${trace.backendMs.toFixed(1)}`, timings,
  ].filter(Boolean).join(", "));
  console.info(JSON.stringify({ event: "api_proxy_completed", request_id: trace.requestId,
    route: trace.route, method: request.method, status: response.status,
    duration_ms: Math.round(performance.now() - started),
    auth_ms: Math.round(trace.authMs), backend_ms: Math.round(trace.backendMs),
  }));
  return response;
}
export const GET=handle;
export const POST=handle;
export const PATCH=handle;
export const DELETE=handle;
