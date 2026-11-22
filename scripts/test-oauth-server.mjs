// Synthetic loopback provider and API. No real Google, Supabase, SMTP or secrets.
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { chatTestApi } from "./chat-test-api.mjs";
const require = createRequire(import.meta.url);
const site = "http://127.0.0.1:34567";
const upstream = "http://127.0.0.1:34568";
const liveApi = process.env.CASHLY_TEST_REAL_API;
if (liveApi && !["127.0.0.1", "localhost"].includes(new URL(liveApi).hostname)) throw new Error("Live verification backend must be loopback");
const emailMode = process.env.CASHLY_TEST_EMAIL === "true";
let password = "";
let otpMode = false, confirmed = true;
let resendDown = false;
let linkCase = "same";
const userId = "10000000-0000-4000-8000-000000000001";
const accountId = "20000000-0000-4000-8000-000000000001";
const user = { id: userId, aud: "authenticated", role: "authenticated", email: "oauth-test@example.invalid", email_confirmed_at: "2026-11-16T00:00:00Z", created_at: "2026-11-16T00:00:00Z", app_metadata: { provider: "google", providers: ["google"] }, user_metadata: { full_name: "OAuth Tester" }, identities: [{ provider: "google", user_id: userId }] };
const account = { account_id: accountId, display_name: "OAuth Tester", username:"cashly.demo", password_login_enabled:emailMode, google_connected:!emailMode, email: user.email, timezone: "Asia/Jakarta", theme_preference: "system", joined_at: user.created_at, sample_data: true };
const today = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const monday = new Date(today+"T00:00:00Z"); monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay()+6)%7);
const game = {hero_level:1,current_streak:0,longest_streak:0,protection_remaining:5,protection_month:today.slice(0,7)+"-01",streak_status:"active",today_checked_in:false,today_local_date:today,timezone:"Asia/Jakarta",recovery:null,calendar:Array.from({length:7},(_,n)=>({date:new Date(monday.getTime()+n*86400000).toISOString().slice(0,10),status:"missed"})),missions:[]};
let usedLinks = new Set();
let recoveryGrant=null;
let challenge, revoked = false, backendDown = false;
const calls = [];
function session() {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = [ { alg: "HS256", typ: "JWT" }, { sub: userId, aud: "authenticated", exp, iss: `${upstream}/auth/v1` } ].map(value => Buffer.from(JSON.stringify(value)).toString("base64url")).join(".") + ".c3ludGhldGlj";
  return { access_token: token, refresh_token: "synthetic-refresh", token_type: "bearer", expires_in: 3600, expires_at: exp, user };
}
if (emailMode) { user.app_metadata = { provider: "email", providers: ["email"] }; user.identities = [{ provider: "email", user_id: userId }]; }
const server = createServer(async (req, res) => {
  const url = new URL(req.url, upstream);
  const send = (status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  if (url.pathname === "/__test/state") return send(200, { calls, revoked });
  if (process.env.CASHLY_TEST_OFFLINE === "true" && url.pathname === "/__test/offline-account") {
    const variant = url.searchParams.get("name") === "B" ? "B" : "A";
    account.account_id = variant === "A" ? accountId : "20000000-0000-4000-8000-000000000002";
    account.display_name = `Offline ${variant}`; account.sample_data = false;
    account.runtime = { environment: "staging", database_kind: "hosted" };
    Object.assign(game, { current_streak: 7, longest_streak: 7, hero_level: 1, recovery: null, streak_status: "active" });
    return send(200, {});
  }
  if (url.pathname === "/__test/otp") { otpMode = url.searchParams.get("enabled") !== "false"; confirmed = !otpMode; password = ""; calls.length = 0; return send(200, {}); }
  if (url.pathname === "/__test/backend-down") { backendDown = url.searchParams.get("enabled") === "true"; return send(200, {}); }
  if (url.pathname === "/__test/resend-down") { resendDown = url.searchParams.get("enabled") === "true"; return send(200, {}); }
  if (url.pathname === "/__test/profile-mode") {
    usedLinks.clear();recoveryGrant=null;
    account.password_login_enabled=false; account.google_connected=true; password=""; revoked=false;
    user.id=userId;user.email="oauth-test@example.invalid";account.email=user.email;
    user.identities=[{provider:"google",user_id:userId,identity_id:"google-test",identity_data:{email:user.email,email_verified:true}}];
    const dates=[2,1].map(n=>new Date(new Date(today+"T00:00:00Z").getTime()-n*86400000).toISOString().slice(0,10));
    Object.assign(game,{hero_level:2,current_streak:30,longest_streak:30,streak_status:"needs_recovery",protection_remaining:5,today_checked_in:false,recovery:{protected_local_dates:dates,required:2,can_restore:true,streak_after_recovery:31}});
    return send(200,{});
  }
  if (url.pathname === "/__test/link-mode") {
    usedLinks.clear();recoveryGrant=null;
    linkCase=url.searchParams.get("case")??"same";
    user.id=userId;user.email="oauth-test@example.invalid";account.email=user.email;
    user.identities=[{provider:"email",user_id:userId,identity_id:"email-test"}];
    account.password_login_enabled=true;account.google_connected=false;revoked=false;
    password="Local-Test123!";calls.length=0;
    return send(200,{});
  }
  calls.push(url.pathname); // Paths only; never log code, verifier, credentials or bodies.
  if (liveApi && /^\/api\/v1\/(?:chat\/|receipts\/|voice\/|expenses(?:$|\/)|reports\/|gamification\/|categories|me(?:$|\/)|auth\/bootstrap)/.test(url.pathname)) {
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const response = await fetch(liveApi + url.pathname + url.search, {
        method: req.method, headers: { "Content-Type": "application/json", "Authorization": req.headers.authorization ?? "",
          "Idempotency-Key": req.headers["idempotency-key"] ?? "", "X-Request-ID": req.headers["x-request-id"] ?? "" },
        body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks), signal: AbortSignal.timeout(50000),
      });
      res.writeHead(response.status, { "Content-Type": "application/json", "Server-Timing": response.headers.get("server-timing") ?? "" });
      res.end(await response.text());
    } catch { send(503, { error: { message: "Local verification backend unavailable" } }); }
    return;
  }
  if (process.env.CASHLY_TEST_CHAT === "true" && await chatTestApi(req, url, send)) return;
  if(url.pathname==="/auth/v1/user/identities/authorize") {
    if(!req.headers.authorization?.startsWith("Bearer "))return send(401,{});
    if(linkCase==="disabled")return send(400,{code:"manual_linking_disabled"});
    if(url.searchParams.get("redirect_to")!==`${site}/auth/google/connect/callback`)return send(400,{});
    challenge=url.searchParams.get("code_challenge");
    return send(200,{url:`${upstream}/fake-google-link`});
  }
  if(url.pathname==="/fake-google-link") {
    if(linkCase!=="cancel"){
      user.identities.push({provider:"google",user_id:userId,identity_id:"google-test",identity_data:{email:linkCase==="mismatch"?"different@example.invalid":user.email,email_verified:true}});
      account.google_connected=true;
    }
    res.writeHead(302,{Location:`${site}/auth/google/connect/callback?${linkCase==="cancel"?"error=access_denied":"code=synthetic-link"}`});return res.end();
  }
  if(url.pathname==="/auth/v1/user/identities/google-test"&&req.method==="DELETE") {
    user.identities=user.identities.filter(identity=>identity.provider!=="google");account.google_connected=false;
    return send(200,{});
  }
  if (url.pathname === "/api/v1/auth/configuration") return send(200, { supabase_url: upstream, publishable_key: "synthetic-publishable-key", local: emailMode });
  if(url.pathname.startsWith("/api/v1/auth/password/reset/")) {
    let raw="";for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);
    if(url.pathname.endsWith('/request'))return send(202,{data:{status:"verification_required",session:null}});
    if(url.pathname.endsWith('/start')) {
      if(body.email!==user.email || body.token_hash!=="a".repeat(64) || usedLinks.has(body.token_hash))return send(400,{error:{message:"Tautan tidak valid atau kedaluwarsa."}});
      usedLinks.add(body.token_hash);
      recoveryGrant={recovery_id:"40000000-0000-4000-8000-000000000001",recovery_token:"synthetic-recovery-only",email:user.email,expires_at:new Date(Date.now()+300000).toISOString(),consumed:false};
      return send(200,{data:{status:"recovery_ready",...recoveryGrant}});
    }
    if(!recoveryGrant || recoveryGrant.consumed || Date.parse(recoveryGrant.expires_at)<=Date.now() || body.recovery_id!==recoveryGrant.recovery_id || body.recovery_token!==recoveryGrant.recovery_token)return send(409,{error:{message:"Sesi pemulihan sudah berakhir. Minta tautan baru."}});
    if(url.pathname.endsWith('/cancel')) {recoveryGrant.consumed=true;return send(200,{data:{status:"recovery_cancelled"}});}
    if(body.password===password)return send(422,{error:{code:"PASSWORD_UNCHANGED",message:"Kata sandi baru harus berbeda dari sebelumnya."}});
    recoveryGrant.consumed=true;password=body.password;account.password_login_enabled=true;revoked=true;
    return send(200,{data:{status:"password_reset"}});
  }
  if (url.pathname === "/api/v1/auth/email/resend") return resendDown ? send(503, {}) : send(202, { data: { status: "verification_required", session: null } });
  if (url.pathname === "/api/v1/auth/email/verify") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    if (body.token !== "123456") return send(400, { error: { code: "EMAIL_OTP_INVALID" } });
    confirmed = true;
    return send(200, { data: { status: "registered", session: null } });
  }
  if (["/api/v1/auth/register", "/api/v1/auth/login"].includes(url.pathname)) {
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    if (url.pathname.endsWith("/register")) {
      if (password) return send(400, { error: { code: "REGISTRATION_FAILED" } });
      password = body.password; user.email = body.email; user.user_metadata = { full_name: body.name };
      account.email = body.email; account.display_name = body.name;
    } else if (body.email !== user.email || body.password !== password) return send(401, { error: { code: "INVALID_CREDENTIALS" } });
    if (url.pathname.endsWith("/register")) {
      revoked = true;
      if (otpMode) return send(202, { data: { status: "verification_required", session: null } });
      return send(201, { data: { status: "registered", account, session: null } });
    }
    if (!confirmed) return send(403, { error: { code: "EMAIL_NOT_VERIFIED" } });
    revoked = false;
    return send(200, { data: { status: backendDown ? "account_pending" : "authenticated", account: backendDown ? null : account, session: session() } });
  }
  if (url.pathname === "/auth/v1/authorize") {
    if (url.searchParams.get("provider") !== "google" || url.searchParams.get("redirect_to") !== `${site}/auth/callback`) return send(400, {});
    challenge = url.searchParams.get("code_challenge"); revoked = false;
    res.writeHead(302, { Location: `${site}/auth/callback?code=synthetic-code` }); return res.end();
  }
  if (url.pathname === "/auth/v1/signup") {
    if (!emailMode) return send(501, {});
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    if (password) return send(400, { code: "user_already_exists" });
    password = body.password; user.email = body.email; user.user_metadata = body.data;
    account.email = body.email; account.display_name = body.data.full_name; revoked = false;
    return send(200, session());
  }
  if (url.pathname === "/auth/v1/token") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    if (url.searchParams.get("grant_type") === "password") {
      if (!emailMode || body.email !== user.email || body.password !== password) return send(400, { code: "invalid_credentials" });
      revoked = false; return send(200, session());
    }
    if (url.searchParams.get("grant_type") === "pkce" && (!challenge || createHash("sha256").update(body.code_verifier ?? "").digest("base64url") !== challenge)) return send(400, { error: "invalid_grant" });
    if(body.auth_code==='synthetic-link'&&linkCase==='switched')user.id="10000000-0000-4000-8000-000000000099";
    challenge = null; return send(200, session());
  }
  if (url.pathname === "/auth/v1/user") return send(revoked ? 401 : 200, revoked ? { message: "invalid session" } : user);
  if (url.pathname === "/auth/v1/logout") { revoked = true; res.writeHead(204); return res.end(); }
  if (url.pathname.startsWith("/api/v1/")) {
    if (backendDown) return send(503, {});
    if (!req.headers.authorization?.startsWith("Bearer ") || revoked) return send(401, {});
    if (["/api/v1/auth/bootstrap", "/api/v1/me"].includes(url.pathname)) return send(200, { data: account });
    if(url.pathname==="/api/v1/me/account" && req.method==="DELETE") {
      let raw="";for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);
      if(body.confirmation!=="HAPUS AKUN") return send(422,{error:{message:"Ketik HAPUS AKUN."}});
      if(account.password_login_enabled && body.current_password!==password) return send(400,{error:{message:"Kata sandi saat ini tidak sesuai."}});
      revoked=true;password="";
      return send(200,{data:{status:"account_deleted"}});
    }
    if(url.pathname==="/api/v1/me/security/google"||url.pathname==="/api/v1/me/security/google/disconnect") {
      if(req.method==="POST") {
        if(!account.password_login_enabled)return send(409,{error:{message:"Buat kata sandi Cashly sebelum melepas Google."}});
        account.google_connected=false;user.identities=user.identities.filter(identity=>identity.provider!=="google");
      }
      return send(200,{data:{connected:account.google_connected,google_email:account.google_connected?user.email:null,password_login_enabled:account.password_login_enabled,can_disconnect:account.google_connected&&account.password_login_enabled}});
    }
    if (url.pathname === "/api/v1/me/profile") {
      let raw="";for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);
      if(body.username.toLowerCase()==="taken.name")return send(409,{error:{message:"Username sudah digunakan. Pilih yang lain."}});
      account.username=body.username.toLowerCase();account.display_name=body.display_name;
      return send(200,{data:account});
    }
    if(["/api/v1/me/security/password/setup/request","/api/v1/me/security/password/change"].includes(url.pathname)) {
      let raw="";for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);
      if(url.pathname.endsWith("password/change")) {
        if(!account.password_login_enabled || body.current_password!==password)return send(400,{error:{message:"Kata sandi saat ini tidak sesuai."}});
        if(body.password===password)return send(422,{error:{message:"Kata sandi baru harus berbeda."}});
        password=body.password;return send(200,{data:{status:"password_changed"}});
      }
      usedLinks.clear();recoveryGrant=null;return send(202,{data:{status:"link_sent"}});
    }
    if(url.pathname==='/api/v1/gamification/streak/freeze') {
      Object.assign(game,{current_streak:31,protection_remaining:3,today_checked_in:true,recovery:null,streak_status:"active"});
      return send(200,{data:game});
    }
    if(url.pathname==='/api/v1/gamification/overview')return send(200,{data:game});
    if (url.pathname === "/api/v1/expenses") return send(200, { data: [{ id: "30000000-0000-4000-8000-000000000001", merchant: "Kopi Contoh", description: "Kopi contoh", category_code: "food_drink", amount_idr: "28000", occurred_at: new Date().toISOString(), payment_method: "qris", source: "dashboard" }], has_more: false });
  }
  return send(501, {});
});
await new Promise(resolve => server.listen(34568, "127.0.0.1", resolve));
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", "34567"], {
  stdio: "inherit", windowsHide: true,
  env: { ...process.env, CASHLY_ENV_SOURCE: "system", CASHLY_ENV: emailMode ? "dev" : "staging", APP_ORIGIN: site, CASHLY_API_ORIGIN: upstream, SUPABASE_URL: upstream, SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable-key" },
});
function stop() { child.kill(); server.close(); }
process.on("SIGINT", stop); process.on("SIGTERM", stop);
child.on("exit", code => { server.close(); process.exitCode = code ?? 0; });
