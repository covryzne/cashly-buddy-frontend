import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { authConfig, providerConfig } from "./config";

export async function supabaseServer(writable = false) {
  await connection();
  const jar = await cookies();
  const config = await providerConfig();
  return createServerClient(config.supabase, config.key, {
    cookieOptions: {
      httpOnly: true, sameSite: "lax", secure: config.site.startsWith("https:"), path: "/",
    },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(10000) }) },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (updates) => {
        // Server Components cannot write cookies. Proxy handles refresh before rendering.
        if (writable) updates.forEach(({ name, value, options }) => jar.set(name, value, options));
      },
    },
  });
}

export async function verifiedSession(writable = false) {
  const supabase = await supabaseServer(writable);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  // Read transport credentials only after getUser independently verifies identity.
  const { data: { session } } = await supabase.auth.getSession();
  return session ? { supabase, user, token: session.access_token } : null;
}

export async function backend(path: string, token: string, method = "GET") {
  return fetch(`${authConfig().api}/api/v1${path}`, {
    method, headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    signal: AbortSignal.timeout(15000), redirect: "error",
  });
}
