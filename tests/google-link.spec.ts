import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, request }) => {
  await request.get("http://127.0.0.1:34568/__test/profile-mode");
  await page.goto("/login");
  await page.getByRole("button", { name: "Lanjutkan dengan Google" }).click();
  await expect(page).toHaveURL(/\/beranda/);
});

for (const scenario of ["same", "mismatch", "cancel", "disabled", "switched"]) {
  test(`Google linking ${scenario} preserves the Cashly account`, async ({ page, request, context }) => {
    await request.get(`http://127.0.0.1:34568/__test/link-mode?case=${scenario}`);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto("/profil");
    if (scenario === "same") await page.locator(".account-google-row").screenshot({ path: "test-results/google-inline-action.png" });
    const before = await (await context.request.get("/auth/session")).json();
    const csrf = await context.request.post("/auth/google/connect", { headers: { Origin: "https://evil.invalid" }, maxRedirects: 0 });
    expect(csrf.status()).toBe(403);
    await expect(page.getByText("Disconnected", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Hubungkan Google", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("oauth-test@example.invalid");
    await page.getByRole("button", { name: "Lanjutkan ke Google" }).click();
    if (scenario === "switched") {
      await expect(page).toHaveURL(/\/login/);
      expect((await context.cookies()).filter(cookie => cookie.name.startsWith("sb-") && cookie.value)).toHaveLength(0);
      const state = await (await request.get("http://127.0.0.1:34568/__test/state")).json();
      expect(state.calls).not.toContain("/api/v1/auth/bootstrap");
      return;
    }
    const dialog = page.getByRole("dialog");
    if (scenario === "same") {
      await expect(dialog.getByRole("heading", { name: "Google berhasil terhubung" })).toBeVisible();
      await dialog.getByRole("button", { name: "Mengerti" }).click();
      await expect(page.getByText("Connected", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Hubungkan Google", exact: true })).toHaveCount(0);
    } else {
      await expect(dialog.getByRole("heading", { name: "Koneksi Google belum selesai" })).toBeVisible();
      if (scenario === "mismatch") await expect(dialog).toContainText("Email Google berbeda");
      if (scenario === "disabled") await expect(dialog).toContainText("Google belum tersedia");
      await dialog.getByRole("button", { name: "Mengerti" }).click();
      await expect(page.getByText("Disconnected", { exact: true })).toBeVisible();
    }
    const after = await (await context.request.get("/auth/session")).json();
    expect(after.account_id).toBe(before.account_id);
    await expect(page.getByRole("button", { name: /Ganti email/ })).toHaveCount(0);
    const state = await (await request.get("http://127.0.0.1:34568/__test/state")).json();
    expect(state.calls).not.toContain("/api/v1/auth/bootstrap");
    if (scenario === "mismatch") expect(state.calls).toContain("/auth/v1/user/identities/google-test");
    expect((await context.cookies()).filter(cookie => cookie.name === "cashly-google-link")).toHaveLength(0);
  });
}

test("initial password setup uses link and email change is unavailable", async ({page,request})=>{
  await page.goto("/profil");
  await expect(page.getByRole("button",{name:/Ganti email/})).toHaveCount(0);
  await page.getByRole("button",{name:/Buat kata sandi Cashly/}).click();
  await expect(page.getByLabel("Kata sandi baru",{exact:true})).toHaveCount(0);
  await expect(page.getByRole("dialog")).toContainText("Kami akan mengirim tautan");
  for(const path of ["/api/cashly/me/security/email/request","/auth/email/change/verify"]) {
    expect((await request.post(path,{headers:{Origin:"http://127.0.0.1:34567"},data:{}})).status()).toBe(404);
  }
  expect((await request.get("/auth/email/change/callback")).status()).toBe(404);
  expect((await request.get("/confirm-email")).status()).toBe(404);
});

test("Google-only account must set up password before disconnecting", async ({ page, request }) => {
  await page.goto("/profil");
  await page.getByRole("button", { name: "Detail koneksi Google", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Koneksi Google", exact: true });
  await expect(dialog).toContainText("Password akun belum dibuat");
  await expect(dialog.getByRole("button", { name: "Lepaskan Google", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Buat kata sandi Cashly", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Buat kata sandi Cashly", exact: true })).toBeVisible();
  const state = await (await request.get("http://127.0.0.1:34568/__test/state")).json();
  expect(state.calls).not.toContain("/api/v1/me/security/google/disconnect");
});

test("confirmed Google disconnect keeps email login and the same account", async ({ page, request, context }) => {
  await request.get("http://127.0.0.1:34568/__test/link-mode?case=same");
  await page.goto("/profil");
  await page.getByRole("button", { name: "Hubungkan Google", exact: true }).click();
  await page.getByRole("button", { name: "Lanjutkan ke Google" }).click();
  await page.getByRole("button", { name: "Mengerti", exact: true }).click();
  const before = await (await context.request.get("/auth/session")).json();
  expect((await context.request.post("/api/cashly/me/security/google/disconnect", { headers: { Origin: "https://evil.invalid" }, data: {} })).status()).toBe(403);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Detail koneksi Google", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("oauth-test@example.invalid");
  await page.getByRole("button", { name: "Lepaskan Google", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Akun dan transaksi tetap tersimpan");
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  let state = await (await request.get("http://127.0.0.1:34568/__test/state")).json();
  expect(state.calls).not.toContain("/api/v1/me/security/google/disconnect");
  await page.getByRole("button", { name: "Lepaskan Google", exact: true }).click();
  await page.getByRole("dialog").screenshot({ path: "test-results/google-disconnect-confirm.png" });
  await page.route("**/api/cashly/me/security/google/disconnect", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({error:{message:"Layanan akun belum tersedia."}}) }));
  await page.getByRole("button", { name: "Ya, lepaskan Google", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Layanan akun belum tersedia");
  await expect(page.getByRole("heading", { name: "Google berhasil dilepas", exact: true })).toHaveCount(0);
  await page.unroute("**/api/cashly/me/security/google/disconnect");
  await page.getByRole("button", { name: "Ya, lepaskan Google", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Google berhasil dilepas", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Selesai", exact: true }).click();
  await expect(page.getByText("Disconnected", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hubungkan Google", exact: true })).toBeVisible();
  const after = await (await context.request.get("/auth/session")).json();
  expect(after.account_id).toBe(before.account_id);
  await page.reload();
  await expect(page.getByText("Disconnected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Keluar dari akun/ }).click();
  await page.locator(".profile-logout-confirm").click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email", { exact: true }).fill("oauth-test@example.invalid");
  await page.getByLabel("Kata sandi", { exact: true }).fill("Local-Test123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/beranda/);
  expect((await (await context.request.get("/auth/session")).json()).account_id).toBe(before.account_id);
  state = await (await request.get("http://127.0.0.1:34568/__test/state")).json();
  expect(state.calls.filter((path: string) => path === "/api/v1/me/security/google/disconnect")).toHaveLength(1);
});
