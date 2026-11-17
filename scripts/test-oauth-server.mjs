// Synthetic loopback provider and API. No real Google, Supabase, SMTP or secrets.
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const site = "http://127.0.0.1:34567";
const upstream = "http://127.0.0.1:34568";
const emailMode = process.env.CASHLY_TEST_EMAIL === "true";
let password = "";
let otpMode = false, confirmed = true;
let resendDown = false;
const userId = "10000000-0000-4000-8000-000000000001";
const accountId = "20000000-0000-4000-8000-000000000001";
const user = { id: userId, aud: "authenticated", role: "authenticated", email: "oauth-test@example.invalid", email_confirmed_at: "2026-11-16T00:00:00Z", created_at: "2026-11-16T00:00:00Z", app_metadata: { provider: "google", providers: ["google"] }, user_metadata: { full_name: "OAuth Tester" }, identities: [{ provider: "google", user_id: userId }] };
const account = { account_id: accountId, display_name: "OAuth Tester", username:"cashly.demo", password_login_enabled:emailMode, google_connected:!emailMode, email: user.email, timezone: "Asia/Jakarta", theme_preference: "system", joined_at: user.created_at, sample_data: true };
const today = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const monday = new Date(today+"T00:00:00Z"); monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay()+6)%7);
const game = {hero_level:1,current_streak:0,longest_streak:0,protection_remaining:5,protection_month:today.slice(0,7)+"-01",streak_status:"active",today_checked_in:false,today_local_date:today,timezone:"Asia/Jakarta",recovery:null,calendar:Array.from({length:7},(_,n)=>({date:new Date(monday.getTime()+n*86400000).toISOString().slice(0,10),status:"missed"})),missions:[]};
let security = null;
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
  if (url.pathname === "/__test/otp") { otpMode = url.searchParams.get("enabled") !== "false"; confirmed = !otpMode; password = ""; calls.length = 0; return send(200, {}); }
  if (url.pathname === "/__test/backend-down") { backendDown = url.searchParams.get("enabled") === "true"; return send(200, {}); }
  if (url.pathname === "/__test/resend-down") { resendDown = url.searchParams.get("enabled") === "true"; return send(200, {}); }
  if (url.pathname === "/__test/profile-mode") {
    account.password_login_enabled=false; account.google_connected=true; password=""; revoked=false;
    user.email="oauth-test@example.invalid";account.email=user.email;
    const dates=[2,1].map(n=>new Date(new Date(today+"T00:00:00Z").getTime()-n*86400000).toISOString().slice(0,10));
    Object.assign(game,{hero_level:2,current_streak:30,longest_streak:30,streak_status:"needs_recovery",protection_remaining:5,today_checked_in:false,recovery:{protected_local_dates:dates,required:2,can_restore:true,streak_after_recovery:31}});
    return send(200,{});
  }
  calls.push(url.pathname); // Paths only; never log code, verifier, credentials or bodies.
  if (url.pathname === "/api/v1/auth/configuration") return send(200, { supabase_url: upstream, publishable_key: "synthetic-publishable-key", local: emailMode });
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
    challenge = null; return send(200, session());
  }
  if (url.pathname === "/auth/v1/user") return send(revoked ? 401 : 200, revoked ? { message: "invalid session" } : user);
  if (url.pathname === "/auth/v1/logout") { revoked = true; res.writeHead(204); return res.end(); }
  if (url.pathname.startsWith("/api/v1/")) {
    if (backendDown) return send(503, {});
    if (!req.headers.authorization?.startsWith("Bearer ") || revoked) return send(401, {});
    if (["/api/v1/auth/bootstrap", "/api/v1/me"].includes(url.pathname)) return send(200, { data: account });
    if (url.pathname === "/api/v1/me/profile") {
      let raw="";for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);
      if(body.username.toLowerCase()==="taken.name")return send(409,{error:{message:"Username sudah digunakan. Pilih yang lain."}});
      account.username=body.username.toLowerCase();account.display_name=body.display_name;
      return send(200,{data:account});
    }
    if(url.pathname.match(/^\/api\/v1\/me\/security\/(email|password)\/(request|verify)$/)) {
      let raw="";for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);
      const mode=url.pathname.includes('/email/') ? 'email':'password';
      if(url.pathname.endsWith('/request')) {
        security={challenge_id:"50000000-0000-4000-8000-000000000001",expires_at:new Date(Date.now()+300000).toISOString(),current_email:account.email,new_email:body.email??null};
        return send(202,{data:{status:"verification_required",...security}});
      }
      if(mode==='password'&&body.token==='123456') {password=body.password;account.password_login_enabled=true;return send(200,{data:{status:"password_changed"}});}
      if(mode==='email'&&body.address==='current'&&body.token==='111111')return send(200,{data:{status:"confirmation_pending",confirmed_current:true,confirmed_new:false}});
      if(mode==='email'&&body.address==='new'&&body.token==='222222') {account.email=security.new_email;user.email=account.email;return send(200,{data:{status:"email_changed"}});}
      return send(400,{error:{message:"Kode tidak valid."}});
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
