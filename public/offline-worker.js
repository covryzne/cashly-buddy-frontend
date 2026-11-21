/* Public shell only. Never cache page responses, RSC requests, APIs or auth.
   /offline is an audited, prerendered UI with no server account data. */
const SHELL_CACHE = "cashly-offline-shell-v2-account";
const SHELL_URL = "/offline";
const SHELL_MARKER = "public-account-v2";
const OFFLINE_ROUTES = new Set(["/", "/launch", "/beranda", "/aktivitas", "/laporan", "/profil", "/offline"]);
let shellPreparation;

async function boundedFetch(input) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(input, { cache: "no-store", credentials: "omit", signal: controller.signal });
    if (response.redirected) throw new Error("Unexpected shell redirect");
    // Include the download, not just response headers, in the timeout.
    const body = await response.arrayBuffer();
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  } finally { clearTimeout(timeout); }
}

async function shellReady() {
  const cache = await caches.open(SHELL_CACHE);
  const manifest = await cache.match("/offline-shell-manifest");
  if (!manifest || !(await cache.match(SHELL_URL))) return false;
  const assets = await manifest.json();
  return (await Promise.all(assets.map(url => cache.match(url)))).every(Boolean);
}

function staticFile(value, base) {
  const url = new URL(value, base);
  return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")
    && !url.search && /\.(?:js|css|woff2?)$/.test(url.pathname) ? url.pathname : null;
}

async function prepareOfflineShell() {
  const response = await boundedFetch(SHELL_URL);
  if (!response.ok || response.headers.get("x-cashly-offline-shell") !== SHELL_MARKER
    || !response.headers.get("content-type")?.includes("text/html")) throw new Error("Not a public production shell");
  const html = await response.clone().text();
  const urls = new Set();
  for (const match of html.matchAll(/(?:src|href)="([^"<>]+)"/g)) {
    const path = staticFile(match[1].replaceAll("&amp;", "&"), self.location.origin);
    if (path) urls.add(path);
  }
  if (!urls.size) throw new Error("Missing shell assets");
  const cache = await caches.open(SHELL_CACHE);
  // A partial warmup never publishes a new shell as ready.
  const loaded = new Map();
  await Promise.all([...urls].map(async url => {
    const asset = await boundedFetch(url);
    if (!asset.ok || asset.headers.get("content-type")?.includes("text/html")) throw new Error("Shell asset unavailable");
    loaded.set(url, asset);
    if (url.endsWith(".css")) {
      for (const match of (await asset.clone().text()).matchAll(/url\(["']?([^\s)"']+)["']?\)/g)) {
        const font = staticFile(match[1], new URL(url, self.location.origin));
        if (font && !urls.has(font)) {
          urls.add(font);
          const fontResponse = await boundedFetch(font);
          if (!fontResponse.ok || fontResponse.headers.get("content-type")?.includes("text/html")) throw new Error("Shell font unavailable");
          loaded.set(font, fontResponse);
        }
      }
    }
  }));
  await Promise.all([...loaded].map(([url, asset]) => cache.put(url, asset)));
  await self.warmPublicOfflineAssets();
  await cache.put(SHELL_URL, response);
  await cache.put("/offline-shell-manifest", new Response(JSON.stringify([...urls]), { headers: { "Content-Type": "application/json" } }));
  // Keep current build dependencies only after a complete replacement is ready.
  const keep = new Set([...urls, SHELL_URL, "/offline-shell-manifest"]);
  await Promise.all((await cache.keys()).filter(key => !keep.has(new URL(key.url).pathname)).map(key => cache.delete(key)));
  return true;
}

self.addEventListener("message", event => {
  if (!["PREPARE_OFFLINE_SHELL", "OFFLINE_SHELL_STATUS"].includes(event.data?.type)) return;
  event.waitUntil((async () => {
    let ready = false;
    try {
      if (event.data.type === "PREPARE_OFFLINE_SHELL") {
        shellPreparation ??= prepareOfflineShell().finally(() => { shellPreparation = undefined; });
        await shellPreparation;
      }
      ready = await shellReady();
    } catch { ready = await shellReady().catch(() => false); }
    event.ports[0]?.postMessage({ ready });
  })());
});

function connectionPage() {
  return new Response(`<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cashly · Offline</title><body style="font:16px system-ui;max-width:480px;margin:12vh auto;padding:24px"><h1>Perlu koneksi internet</h1><p>Hubungkan internet untuk masuk atau menyiapkan Cashly di perangkat ini.</p><p>Data akun tidak ditampilkan di halaman ini.</p><a href="/login">Coba masuk kembali</a></body></html>`, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

async function navigation(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response.status < 500) return response;
  } catch { /* Fall back to the public shell, never personalized HTML. */ }
  finally { clearTimeout(timeout); }
  if (new URL(request.url).pathname === "/login") return connectionPage();
  const cache = await caches.open(SHELL_CACHE);
  return (await cache.match(SHELL_URL)) ?? connectionPage();
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || request.headers.has("authorization")) return;
  if (request.mode === "navigate" && (OFFLINE_ROUTES.has(url.pathname) || url.pathname === "/login")) {
    event.respondWith(navigation(request));
  } else if (url.pathname.startsWith("/_next/static/") && !url.search) {
    event.respondWith((async () => {
      const stored = await (await caches.open(SHELL_CACHE)).match(request);
      return stored ?? fetch(request);
    })());
  }
});
