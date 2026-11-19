import sharp from "sharp";

const origin = new URL(process.argv[2] ?? "http://localhost:3000");
const failures = [];
async function check(path, type) {
  const response = await fetch(new URL(path, origin), {
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  const location = response.headers.get("location");
  console.log(
    JSON.stringify({
      path,
      status: response.status,
      contentType,
      redirectHost: location ? new URL(location, origin).host : null,
    }),
  );
  if (response.status !== 200 || !contentType.includes(type)) {
    failures.push(path);
    return null;
  }
  return response;
}
try {
  const page = await check("/login", "text/html");
  if (page) {
    const html = await page.text();
    if (
      !html.includes(
        'rel="apple-touch-icon" href="/icons/apple-touch-icon-mochi-3.png"',
      )
    )
      failures.push("apple-touch-icon metadata");
  }
  const manifest = await check(
    "/manifest.webmanifest",
    "application/manifest+json",
  );
  if (manifest) {
    const data = await manifest.json();
    if (data.display !== "standalone") failures.push("manifest display");
    for (const icon of data.icons ?? []) {
      const image = await check(icon.src, "image/png");
      if (!image) continue;
      const meta = await sharp(
        Buffer.from(await image.arrayBuffer()),
      ).metadata();
      if (`${meta.width}x${meta.height}` !== icon.sizes)
        failures.push(icon.src + " dimensions");
    }
  }
  const icon = await check("/icons/apple-touch-icon-mochi-3.png", "image/png");
  if (icon) {
    const meta = await sharp(Buffer.from(await icon.arrayBuffer())).metadata();
    if (meta.width !== 180 || meta.height !== 180)
      failures.push("Apple icon dimensions");
  }
  await check("/apple-touch-icon.png", "image/png");
} catch (error) {
  failures.push(error.message);
}
if (failures.length) {
  console.error("PWA install check failed: " + failures.join(", "));
  console.error(
    "Icons/manifest must return their own content, without tunnel authentication or interstitial redirects.",
  );
  process.exitCode = 1;
} else
  console.log(
    "PWA files and metadata OK. Home Screen installation still needs a physical-device check.",
  );
