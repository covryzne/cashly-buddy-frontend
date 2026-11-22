import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { authConfig, sameOrigin } from "./config";
import { passwordRules } from "@/features/auth/password-policy";

export const linkHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export const passwordLinkCookie = "cashly-password-link";
const recoveryCookie = "cashly-password-recovery";
const usedLinkCookie="cashly-used-password-link";
const readySchema = z.object({recovery_id:z.string().uuid(),recovery_token:z.string().min(1).max(16384),expires_at:z.string().datetime(),email:z.string().email(),link_digest:z.string().length(64)});
type Recovery = z.infer<typeof readySchema>;
const cookieOptions = () => ({httpOnly:true,sameSite:"lax" as const,secure:authConfig().site.startsWith("https:"),path:"/"});
const hashLink = (value:string) => createHash("sha256").update(value).digest("hex");

const hashPattern = /^[A-Za-z0-9_-]{20,256}$/;
const emailSchema = z.string().trim().email().max(254);

export async function capturePasswordLink(request: Request) {
  const config = authConfig();
  const query = new URL(request.url).searchParams;
  const hash = query.get("token_hash") ?? "";
  const email = query.get("email") ?? "";
  const valid = hashPattern.test(hash) && emailSchema.safeParse(email).success && (await cookies()).get(usedLinkCookie)?.value!==hashLink(hash);
  const target = "/reset-password";
  const response = NextResponse.redirect(new URL(target + (valid ? "" : "?error=link"), config.site), 303);
  Object.entries(linkHeaders).forEach(([key, value]) => response.headers.set(key, value));
  // GET captures the link without consuming it. Verification occurs on explicit
  // submit, so an email scanner cannot spend the single-use token.
  const ready=await readRecovery();
  if(valid && ready && ready.link_digest===hashLink(hash) && ready.email.toLowerCase()===email.toLowerCase()) {
    response.cookies.set(passwordLinkCookie,"",{...cookieOptions(),maxAge:0});
    return response;
  }
  if(!ready || ready.link_digest!==hashLink(hash) || ready.email.toLowerCase()!==email.toLowerCase()) response.cookies.set(recoveryCookie,"",{...cookieOptions(),maxAge:0});
  response.cookies.set(passwordLinkCookie,
    valid ? JSON.stringify({ hash, email, expires_at:new Date(Date.now()+300000).toISOString() }) : "", {
      httpOnly: true, sameSite: "lax", secure: config.site.startsWith("https:"), path: "/", maxAge: valid ? 300 : 0,
    });
  return response;
}

export async function readPasswordLink() {
  try {
    const value = JSON.parse((await cookies()).get(passwordLinkCookie)?.value ?? "null");
    return value && hashPattern.test(value.hash) && emailSchema.safeParse(value.email).success && Date.parse(value.expires_at)>Date.now() ? value as {hash:string;email:string;expires_at:string} : null;
  } catch { return null; }
}

export async function readRecovery():Promise<Recovery|null> {
  try {
    const parsed=readySchema.safeParse(JSON.parse((await cookies()).get(recoveryCookie)?.value ?? "null"));
    return parsed.success && Date.parse(parsed.data.expires_at)>Date.now() ? parsed.data : null;
  } catch {return null;}
}

export async function recoveryPageState() {
  await connection();
  const ready=await readRecovery();
  const pending=await readPasswordLink();
  return ready ? {email:ready.email,expires_at:ready.expires_at} : pending ? {email:pending.email,expires_at:pending.expires_at} : null;
}

async function clearRecovery(clearLogin=false) {
  const jar=await cookies();
  for(const item of jar.getAll()) if(item.name===passwordLinkCookie || item.name===recoveryCookie || (clearLogin && item.name.startsWith("sb-"))) jar.set(item.name,"",{...cookieOptions(),maxAge:0});
}

async function postBackend(path: string, body: unknown) {
  return fetch(`${authConfig().api}/api/v1/${path}`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(45000)});
}

export async function passwordResetAction(request: Request, verify: boolean) {
  try {
    if (!sameOrigin(request)) return Response.json({error:"Permintaan tidak diizinkan."},{status:403,headers:linkHeaders});
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 4096) return Response.json({error:"Permintaan terlalu besar."},{status:413,headers:linkHeaders});
    let input: unknown;
    try { input = JSON.parse(raw); } catch { return Response.json({error:"Permintaan tidak valid."},{status:422,headers:linkHeaders}); }
    const schema = verify ? z.object({password:z.string().min(8).max(16)}).strict() : z.object({email:emailSchema}).strict();
    const parsed = schema.safeParse(input);
    if (!parsed.success) return Response.json({error:"Periksa isian form."},{status:422,headers:linkHeaders});
    const password = "password" in parsed.data ? parsed.data.password : null;
    if(password && passwordRules.some(rule=>!rule.test(password))) return Response.json({error:"Periksa syarat kata sandi."},{status:422,headers:linkHeaders});
    if(!verify) {
      const response=await postBackend("auth/password/reset/request",{...parsed.data,redirect_to:`${authConfig().site}/auth/password/callback`});
      const result=await response.json();
      if(!response.ok) return Response.json({error:result.error?.message ?? "Tautan belum dapat dikirim."},{status:response.status,headers:linkHeaders});
    } else {
      let ready=await readRecovery();
      if(!ready) {
        const proof=await readPasswordLink();
        if(!proof) return Response.json({error:"Sesi pemulihan sudah berakhir. Minta tautan baru."},{status:409,headers:linkHeaders});
        const started=await postBackend("auth/password/reset/start",{email:proof.email,token_hash:proof.hash});
        const result=await started.json();
        if(!started.ok) return Response.json({error:result.error?.message ?? "Tautan tidak berlaku."},{status:started.status,headers:linkHeaders});
        ready=readySchema.parse({...result.data,link_digest:hashLink(proof.hash)});
        const jar=await cookies();
        const value=JSON.stringify(ready);
        if(new TextEncoder().encode(value).length>3800) {
          await postBackend("auth/password/reset/cancel",{recovery_id:ready.recovery_id,recovery_token:ready.recovery_token});
          throw new Error("Recovery proof too large");
        }
        jar.set(recoveryCookie,value,{...cookieOptions(),expires:new Date(ready.expires_at)});
        jar.set(passwordLinkCookie,"",{...cookieOptions(),maxAge:0});
      }
      const response=await postBackend("auth/password/reset/verify",{password,recovery_id:ready.recovery_id,recovery_token:ready.recovery_token});
      const result=await response.json();
      if(!response.ok) {
        // Only a confirmed validation rejection keeps this recovery alive.
        if(![400,422,429].includes(response.status)) await clearRecovery();
        return Response.json({error:result.error?.message ?? "Pemulihan belum berhasil.",expires_at:ready.expires_at},{status:response.status,headers:linkHeaders});
      }
      if(result.data?.status!=="password_reset") throw new Error("Invalid response");
      (await cookies()).set(usedLinkCookie,ready.link_digest,{...cookieOptions(),maxAge:300});
      await clearRecovery(true);
    }
    return Response.json({status:verify ? "password_reset" : "link_sent"},{status:verify ? 200 : 202,headers:linkHeaders});
  } catch { return Response.json({error:"Layanan pemulihan belum tersedia. Coba lagi."},{status:503,headers:linkHeaders}); }
}

export async function cancelPasswordRecovery(request:Request) {
  if(!sameOrigin(request)) return Response.json({error:"Permintaan tidak diizinkan."},{status:403,headers:linkHeaders});
  try {
    const ready=await readRecovery();
    if(ready) {
      const response=await postBackend("auth/password/reset/cancel",{recovery_id:ready.recovery_id,recovery_token:ready.recovery_token});
      if(!response.ok && ![400,409].includes(response.status)) return Response.json({error:"Pembatalan belum berhasil. Coba lagi."},{status:response.status,headers:linkHeaders});
      (await cookies()).set(usedLinkCookie,ready.link_digest,{...cookieOptions(),maxAge:300});
    }
    await clearRecovery();
    return Response.json({status:"recovery_cancelled"},{headers:linkHeaders});
  } catch {return Response.json({error:"Pembatalan belum berhasil. Coba lagi."},{status:503,headers:linkHeaders});}
}
