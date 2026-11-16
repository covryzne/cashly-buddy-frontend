import "server-only";

function origin(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} belum dikonfigurasi.`);
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !(local && url.protocol === "http:"))) {
    throw new Error(`${label} harus origin HTTPS atau HTTP localhost tanpa path.`);
  }
  return url.origin;
}

export function authConfig() {
  const dev = process.env.CASHLY_ENV === "dev";
  const site = origin(process.env.APP_ORIGIN || (dev ? "http://localhost:3000" : undefined), "APP_ORIGIN");
  const api = origin(process.env.CASHLY_API_ORIGIN || (dev ? "http://127.0.0.1:8000" : undefined), "CASHLY_API_ORIGIN");
  return { site, api };
}

export async function providerConfig() {
  const config = authConfig();
  const response = await fetch(`${config.api}/api/v1/auth/configuration`, {
    cache: "no-store", signal: AbortSignal.timeout(10000), redirect: "error",
  });
  if (!response.ok) throw new Error("Konfigurasi Supabase Auth backend belum tersedia.");
  const data = await response.json();
  if (typeof data.publishable_key !== "string" || !data.publishable_key) {
    throw new Error("Publishable key backend belum tersedia.");
  }
  return { ...config, supabase: origin(data.supabase_url, "Supabase backend"), key: data.publishable_key };
}

export function sameOrigin(request: Request): boolean {
  return request.headers.get("origin") === authConfig().site;
}
