import { verifiedSession } from "@/lib/auth/server";
import { authConfig, sameOrigin } from "@/lib/auth/config";

const headers = {"Cache-Control":"private, no-store"};
async function handle(request: Request, context: {params: Promise<{path:string[]}>}) {
  try {
    if (request.method !== "GET" && !sameOrigin(request))
      return Response.json({error:{message:"Permintaan tidak diizinkan."}},{status:403,headers});
    const path = (await context.params).path.join("/");
    const allowed = /^(expenses(?:\/[0-9a-f-]{36}(?:\/restore)?)?|categories|me\/(?:preferences|profile|security\/(?:email|password)\/(?:request|verify))|gamification\/(overview|missions|streak\/calendar|streak\/freeze|checkins\/(no-spend|review))|reports\/(summary|trend|weekly-story|weekly-story\/complete))$/;
    if (!allowed.test(path)) return Response.json({error:{message:"Endpoint tidak tersedia."}},{status:404,headers});
    const session = await verifiedSession(true);
    if (!session) return Response.json({error:{message:"Silakan login kembali."}},{status:401,headers});
    const body = request.method === "GET" ? undefined : await request.text();
    if (body && new TextEncoder().encode(body).length>65536)
      return Response.json({error:{message:"Permintaan terlalu besar."}},{status:413,headers});
    const upstream = await fetch(`${authConfig().api}/api/v1/${path}${new URL(request.url).search}`, {
      method: request.method, headers: {Authorization:`Bearer ${session.token}`,"Content-Type":"application/json",
        "Idempotency-Key":request.headers.get("Idempotency-Key") ?? ""},
      body, cache:"no-store",redirect:"error",signal:AbortSignal.timeout(path.startsWith("me/security/") ? 45000 : 15000),
    });
    return new Response(await upstream.text(),{status:upstream.status,headers:{...headers,"Content-Type":"application/json"}});
  } catch {
    return Response.json({error:{message:"Layanan Cashly belum dapat dihubungi."}},{status:503,headers});
  }
}
export const GET=handle;
export const POST=handle;
export const PATCH=handle;
export const DELETE=handle;
