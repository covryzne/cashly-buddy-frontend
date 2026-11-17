import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [360, 390, 430, 768, 1280, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    test(`Lupa kata sandi ${width}px ${theme}: layout dan aksesibilitas`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/forgot-password");
      await expect(
        page.getByRole("heading", { name: "Lupa kata sandi?", exact: true }),
      ).toBeVisible();
      await expect(
        page
          .locator(".forgot-password-form")
          .getByLabel("Email", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Langkah kecil hari ini")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
      await page.screenshot({
        path: `test-results/forgot-password-${width}-${theme}.png`,
        fullPage: true,
      });
    });
  }
}

test("email recovery link, invalid proof and explicit login", async ({page,request,context})=>{
  await request.get("http://127.0.0.1:34568/__test/link-mode?case=same");
  await page.goto("/login");
  await page.getByRole("link",{name:"Lupa kata sandi?",exact:true}).click();
  await page.getByRole("button",{name:"Kirim tautan reset",exact:true}).click();
  await expect(page.locator(".forgot-password-form").getByRole("alert")).toContainText("email yang valid");
  await page.locator(".forgot-password-form:visible").getByLabel("Email",{exact:true}).fill("oauth-test@example.invalid");
  await page.getByRole("button",{name:"Kirim tautan reset",exact:true}).click();
  await expect(page.getByRole("button",{name:/Kirim ulang dalam/})).toBeDisabled();
  await expect(page.locator(".forgot-password-form")).toContainText("tautan untuk mengatur kata sandi");
  expect((await request.post("/auth/password/reset/verify",{headers:{Origin:"https://evil.invalid"},data:{password:"Reset-Pass123!"}})).status()).toBe(403);
  expect((await request.post("/auth/password/reset/verify",{headers:{Origin:"http://127.0.0.1:34567"},data:{password:"Reset-Pass123!"}})).status()).toBe(409);
  await page.goto("/reset-password");
  await expect(page.getByText("Tautan tidak tersedia atau sudah berakhir.",{exact:true})).toBeVisible();
  await page.goto(`/auth/password/callback?token_hash=${"z".repeat(64)}&email=oauth-test%40example.invalid`);
  await page.getByLabel("Kata sandi baru",{exact:true}).fill("Reset-Pass123!");
  await page.getByLabel("Konfirmasi kata sandi",{exact:true}).fill("Reset-Pass123!");
  await page.getByRole("button",{name:"Simpan kata sandi baru",exact:true}).click();
  await expect(page.locator(".password-reset-form").getByRole("alert")).toContainText("Tautan tidak valid");
  await page.goto(`/auth/password/callback?token_hash=${"a".repeat(64)}&email=oauth-test%40example.invalid`);
  await expect(page).toHaveURL(/\/reset-password$/);
  expect((await context.cookies()).filter(c=>c.name.startsWith("sb-") && c.value)).toHaveLength(0);
  await page.getByLabel("Kata sandi baru",{exact:true}).fill("Local-Test123!");
  await page.getByLabel("Konfirmasi kata sandi",{exact:true}).fill("Local-Test123!");
  await page.getByRole("button",{name:"Simpan kata sandi baru",exact:true}).click();
  await expect(page.locator(".password-reset-form").getByRole("alert")).toContainText("harus berbeda");
  const ready=(await context.cookies()).find(c=>c.name==="cashly-password-recovery");
  expect(ready?.httpOnly).toBeTruthy();
  const deadline=ready!.expires;
  await page.getByRole("button",{name:"Simpan kata sandi baru",exact:true}).click();
  await expect(page.locator(".password-reset-form").getByRole("alert")).toContainText("harus berbeda");
  expect((await context.cookies()).find(c=>c.name==="cashly-password-recovery")?.expires).toBe(deadline);
  await page.goto(`/auth/password/callback?token_hash=${"a".repeat(64)}&email=oauth-test%40example.invalid`);
  expect((await context.cookies()).find(c=>c.name==="cashly-password-recovery")?.expires).toBe(deadline);
  expect((await context.cookies()).find(c=>c.name==="cashly-password-link")).toBeUndefined();
  await page.getByLabel("Kata sandi baru",{exact:true}).fill("Reset-Pass123!");
  await page.getByLabel("Konfirmasi kata sandi",{exact:true}).fill("Reset-Pass123!");
  await page.getByRole("button",{name:"Simpan kata sandi baru",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Kata sandi berhasil disimpan"})).toBeVisible();
  expect((await context.cookies()).filter(c=>c.name.startsWith("sb-") && c.value)).toHaveLength(0);
  expect((await context.cookies()).find(c=>c.name==="cashly-password-recovery")).toBeUndefined();
  expect((await context.request.post("/auth/password/reset/verify",{headers:{Origin:"http://127.0.0.1:34567"},data:{password:"Other-Pass123!"}})).status()).toBe(409);
  await page.getByRole("button",{name:"Ke halaman login",exact:true}).click();
  await page.locator(".login-form:visible").getByLabel("Email",{exact:true}).fill("oauth-test@example.invalid");
  await page.locator(".login-form:visible").getByLabel("Kata sandi",{exact:true}).fill("Reset-Pass123!");
  await page.getByRole("button",{name:"Masuk",exact:true}).click();
  await expect(page).toHaveURL(/\/beranda/);
  await page.goto(`/auth/password/callback?token_hash=${"a".repeat(64)}&email=oauth-test%40example.invalid`);
  await expect(page.getByText("Tautan tidak tersedia atau sudah berakhir.",{exact:true})).toBeVisible();
  await request.get("http://127.0.0.1:34568/__test/otp?enabled=false");
});

for(const action of ["cancel","expire"] as const) test(`password recovery ${action} is terminal`,async({page,request,context})=>{
  await request.get("http://127.0.0.1:34568/__test/link-mode?case=same");
  await page.goto(`/auth/password/callback?token_hash=${"a".repeat(64)}&email=oauth-test%40example.invalid`);
  await page.getByLabel("Kata sandi baru",{exact:true}).fill("Local-Test123!");
  await page.getByLabel("Konfirmasi kata sandi",{exact:true}).fill("Local-Test123!");
  await page.getByRole("button",{name:"Simpan kata sandi baru",exact:true}).click();
  await expect(page.locator(".password-reset-form").getByRole("alert")).toContainText("harus berbeda");
  if(action==="expire") {
    await page.clock.install();await page.clock.fastForward(301000);
    await expect(page.getByText("Sesi pemulihan sudah berakhir. Minta tautan baru.",{exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"Simpan kata sandi baru",exact:true})).toBeDisabled();
  }
  await page.getByRole("button",{name:"Batal",exact:true}).click();
  await expect(page).toHaveURL(/\/login/);
  expect((await context.cookies()).find(c=>c.name==="cashly-password-recovery")).toBeUndefined();
});
