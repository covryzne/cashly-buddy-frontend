/* Public assets only. Bump VERSION whenever a listed file or Spline export changes,
   even when its URL stays the same. Keep SCENE in sync with spline-mascot.tsx. */
const VERSION = "v6-mochi-posters";
// Separate public offline shell; asset allowlist and private-data exclusions stay scoped.
if (typeof importScripts === "function") importScripts("/offline-worker.js");

const notificationId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

self.addEventListener("push", (event) => {
  let payload;
  try { payload = event.data?.json(); } catch { return; }
  if (!payload || !notificationId.test(payload.id) ||
    typeof payload.title !== "string" || typeof payload.body !== "string") return;
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "/icons/icon-192.png",
    tag: `cashly-${payload.id}`,
    data: { id: payload.id, kind: payload.kind === "test" ? "test" : "reminder" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  const id = event.notification.data?.id;
  if (!notificationId.test(id)) return;
  event.notification.close();
  const isTest = event.notification.data?.kind === "test";
  const target = new URL(isTest ? "/profil#preferensi" : "/beranda", self.location.origin);
  if (!isTest) target.searchParams.set("notif", id);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const cashly = windows.find((client) => {
      const url = new URL(client.url);
      return url.origin === target.origin && ["/beranda", "/aktivitas", "/laporan", "/profil"].includes(url.pathname);
    });
    if (cashly) {
      const navigated = await cashly.navigate(target.href).catch(() => null);
      if (navigated) return navigated.focus();
    }
    return self.clients.openWindow(target.href);
  })());
});
const PREFIX = "cashly-public-assets-";
const CACHE = `${PREFIX}${VERSION}`;
const SCENE = "https://prod.spline.design/R4tRoaLYG0dA8fQD/scene.splinecode";
const ASSETS = [
  "/mascot/mochi-crown-transparent.webp",
  "/mascot/mochi-crown-transparent.png",
  "/mascot/mochi-level-1-transparent.png",
  "/mascot/mochi-level-2.webp",
  "/mascot/mochi-level-3.webp",
  "/mascot/mochi-level-4.webp",
  "/branding/header-light.png",
  "/branding/header-dark.png",
  "/branding/google-g.png",
  "/icons/icon-192.png?v=mochi-1",
  "/icons/icon-512.png?v=mochi-1",
  "/icons/icon-maskable-512.png?v=mochi-1",
  "/icons/favicon-16.png?v=mochi-1",
  "/icons/favicon-32.png?v=mochi-1",
  "/apple-touch-icon.png?v=mochi-2",
  // Stable Apple touch-icon URL, using the approved app artwork.
  "/icons/apple-touch-icon-mochi-3.png",
  "/favicon.ico?v=mochi-1",
];
const paths = new Set(
  ASSETS.map((asset) => new URL(asset, self.location.origin).pathname),
);
const pending = new Map();

function assetCredentials(url) {
  // A private dev tunnel authenticates these public files with its own cookie.
  // Keep that browser-managed session locally; never send cookies to the CDN.
  return new URL(url, self.location.origin).origin === self.location.origin
    ? "same-origin"
    : "omit";
}

function publicImage(url) {
  return (
    url.origin === self.location.origin &&
    paths.has(url.pathname) &&
    [...url.searchParams.keys()].every((key) => key === "v")
  );
}

function allowed(url) {
  if (url.href === SCENE || publicImage(url)) return true;
  if (url.origin !== self.location.origin || url.pathname !== "/_next/image")
    return false;
  const source = url.searchParams.get("url");
  return (
    source?.startsWith("/") &&
    publicImage(new URL(source, self.location.origin)) &&
    [...url.searchParams.keys()].every((key) => ["url", "w", "q"].includes(key))
  );
}

function usable(response) {
  const type = response.headers.get("content-type") || "";
  return (
    response.status === 200 &&
    !response.redirected &&
    (type.startsWith("image/") ||
      type.startsWith("application/json") ||
      type.startsWith("application/octet-stream"))
  );
}

async function assetResponse(request) {
  if (new URL(request.url).pathname === "/_next/image") {
    // A generic warmup Accept header makes Next flatten alpha into JPEG.
    // Public source images already require WebP support. Use one alpha-safe
    // representation for both warmup and browser requests, preserving Vary.
    const headers = new Headers(request.headers);
    headers.set("Accept", "image/webp");
    request = new Request(request, { headers });
  }
  let cache;
  try {
    cache = await caches.open(CACHE);
    const stored = await cache.match(request);
    if (stored && usable(stored)) return stored;
    if (stored) await cache.delete(request);
  } catch {
    // Private browsing, quota, or unavailable storage must not block the UI.
  }
  let download = pending.get(request.url);
  if (!download) {
    download = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(request, {
          credentials: assetCredentials(request.url),
          cache: "no-cache",
          signal: controller.signal,
        });
        if (cache && usable(response)) {
          try {
            await cache.put(request, response.clone());
            const entries = await cache.keys();
            // Bound optimized image variants while retaining the large scene.
            const removable = entries.filter((entry) => entry.url !== SCENE);
            await Promise.all(
              removable
                .slice(0, Math.max(0, entries.length - 64))
                .map((entry) => cache.delete(entry)),
            );
          } catch {
            // Still serve a successful download when caching fails.
          }
        }
        return response;
      } catch (error) {
        // An unvisited page may request a new Next image width while offline.
        // Reuse the cached public source instead of showing a broken image.
        const url = new URL(request.url);
        if (cache && url.pathname === "/_next/image") {
          const source = url.searchParams.get("url");
          if (source && publicImage(new URL(source, self.location.origin))) {
            const fallback = await cache.match(new Request(new URL(source, self.location.origin)));
            if (fallback && usable(fallback)) return fallback;
          }
        }
        throw error;
      } finally {
        clearTimeout(timeout);
        pending.delete(request.url);
      }
    })();
    pending.set(request.url, download);
  }
  return (await download).clone();
}

self.warmPublicOfflineAssets = async function () {
  // Small public posters/icons only; never preload the large Spline scene here.
  await Promise.all(ASSETS.map(async path => {
    const response = await assetResponse(new Request(new URL(path, self.location.origin)));
    if (!usable(response)) throw new Error("Public offline asset unavailable");
  }));
};

self.addEventListener("install", (event) => {
  // Public demo shell only; never force a page reload. Revisit activation and
  // rollout coordination before adding authenticated production offline data.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys().catch(() => []);
      await Promise.allSettled(
        names
          .filter((name) => name.startsWith(PREFIX) && name !== CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (
    request.method !== "GET" ||
    request.mode === "navigate" ||
    request.headers.has("authorization") ||
    !allowed(new URL(request.url))
  )
    return;
  event.respondWith(assetResponse(request));
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "WARM_PUBLIC_ASSETS") return;
  const images = Array.isArray(event.data.images)
    ? event.data.images.slice(0, 16)
    : [];
  const urls = [...ASSETS, ...images];
  if (event.data.includeScene === true) urls.push(SCENE);
  event.waitUntil(
    Promise.allSettled(
      [...new Set(urls)].flatMap((value) => {
        if (typeof value !== "string") return [];
        try {
          const url = new URL(value, self.location.origin);
          return allowed(url)
            ? [
                assetResponse(
                  new Request(url, {
                    mode: "cors",
                    credentials: assetCredentials(url.href),
                  }),
                ),
              ]
            : [];
        } catch {
          return [];
        }
      }),
    ),
  );
});
