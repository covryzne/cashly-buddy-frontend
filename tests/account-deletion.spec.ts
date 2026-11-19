import { expect,test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for(const mode of ["password","google"] as const) test(`delete ${mode} account confirms, retries and clears login`,async({page,request,context})=>{
  await request.get(`http://127.0.0.1:34568/__test/${mode==="password" ? "link-mode?case=same" : "profile-mode"}`);
  await page.goto("/login");
  if(mode==="google") await page.getByRole("button",{name:"Lanjutkan dengan Google",exact:true}).click();
  else {
    await page.locator(".login-form:visible").getByLabel("Email",{exact:true}).fill("oauth-test@example.invalid");
    await page.locator(".login-form:visible").getByLabel("Kata sandi",{exact:true}).fill("Local-Test123!");
    await page.getByRole("button",{name:"Masuk",exact:true}).click();
  }
  await expect(page).toHaveURL(/\/beranda/);
  await page.goto("/profil");
  await page.setViewportSize({width:390,height:844});
  await page.getByRole("button",{name:"Hapus akun",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Hapus akun permanen?",exact:true});
  await expect(dialog).toContainText("tidak bisa dibatalkan");
  await page.getByRole("button",{name:"Batal",exact:true}).click();
  await expect(dialog).toHaveCount(0);
  expect((await context.request.post("/auth/account/delete",{headers:{Origin:"https://evil.invalid"},data:{confirmation:"HAPUS AKUN"}})).status()).toBe(403);
  expect((await context.request.post("/auth/account/delete",{headers:{Origin:"http://127.0.0.1:34567"},data:{confirmation:"HAPUS AKUN",account_id:"other"}})).status()).toBe(422);
  await page.getByRole("button",{name:"Hapus akun",exact:true}).click();
  await page.getByRole("button",{name:"Hapus akun permanen",exact:true}).click();
  await expect(dialog.getByRole("alert")).toContainText("Ketik HAPUS AKUN");
  await page.getByLabel("Ketik HAPUS AKUN",{exact:true}).fill("HAPUS AKUN");
  if(mode==="password") {
    await page.getByRole("button",{name:"Hapus akun permanen",exact:true}).click();
    await expect(dialog.getByRole("alert")).toContainText("Masukkan kata sandi saat ini");
    await page.getByLabel("Kata sandi saat ini",{exact:true}).fill("Wrong-Pass999!");
    await page.getByRole("button",{name:"Hapus akun permanen",exact:true}).click();
    await expect(dialog.getByRole("alert")).toContainText("tidak sesuai");
    await page.getByLabel("Kata sandi saat ini",{exact:true}).fill("Local-Test123!");
  } else {
    await expect(page.getByLabel("Kata sandi saat ini",{exact:true})).toHaveCount(0);
    await expect(dialog).toContainText("bukan akun Google");
  }
  for(const theme of ["light","dark"]) {
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa"]).analyze()).violations).toEqual([]);
    await dialog.screenshot({path:`test-results/delete-account-${mode}-${theme}.png`});
  }
  await request.get("http://127.0.0.1:34568/__test/backend-down?enabled=true");
  await page.getByRole("button",{name:"Hapus akun permanen",exact:true}).click();
  await expect(dialog.getByRole("alert")).toContainText("Akun belum dapat dihapus");
  await request.get("http://127.0.0.1:34568/__test/backend-down?enabled=false");
  await page.getByRole("button",{name:"Hapus akun permanen",exact:true}).click();
  await expect(page).toHaveURL(/\/login\?account=deleted/);
  await expect(page.getByRole("dialog",{name:"Akun berhasil dihapus",exact:true})).toBeVisible();
  expect((await context.cookies()).filter(item=>item.name.startsWith("sb-") && item.value)).toHaveLength(0);
  await page.getByRole("button",{name:"Mengerti",exact:true}).click();
  await expect(page).toHaveURL(/\/login$/);
  if(mode==="password") {
    await page.locator(".login-form:visible").getByLabel("Email",{exact:true}).fill("oauth-test@example.invalid");
    await page.locator(".login-form:visible").getByLabel("Kata sandi",{exact:true}).fill("Local-Test123!");
    await page.getByRole("button",{name:"Masuk",exact:true}).click();
    await expect(page.locator(".login-form:visible").getByRole("alert")).toContainText("Email atau kata sandi tidak sesuai");
  }
});
