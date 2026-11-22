import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.use({ reducedMotion: 'reduce', viewport: { width: 320, height: 740 } });

test.beforeEach(async ({ request, page }) => {
  await request.get('http://127.0.0.1:34568/__test/otp?enabled=false');
  await request.post('/auth/email/register', {
    headers: { Origin: 'http://127.0.0.1:34567' },
    data: { name: 'Permissions Tester', email: 'permissions@example.invalid', password: 'Local-Test123!', confirmPassword: 'Local-Test123!' },
  });
  await page.goto('/login');
  await page.locator('.login-form:visible').getByLabel('Email', { exact: true }).fill('permissions@example.invalid');
  await page.locator('.login-form:visible').getByLabel('Kata sandi', { exact: true }).fill('Local-Test123!');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page).toHaveURL(/\/beranda/);
});

test('Granting access shows status only and stops every track', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.assign(window, { mediaCalls: 0, stoppedTracks: 0 });
    const permissions = { camera: Object.assign(new EventTarget(), { state: 'prompt' }), microphone: Object.assign(new EventTarget(), { state: 'prompt' }) };
    navigator.permissions.query = async ({ name }) => permissions[name as keyof typeof permissions] as PermissionStatus;
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const counters = window as unknown as { mediaCalls: number; stoppedTracks: number };
      counters.mediaCalls++;
      const permission = constraints?.video ? permissions.camera : permissions.microphone;
      permission.state = 'granted';
      permission.dispatchEvent(new Event('change'));
      return { getTracks: () => [{ stop: () => { counters.stoppedTracks++; } }] } as unknown as MediaStream;
    };
  });
  await page.goto('/profil');
  const entry = page.getByRole('button', { name: /Perizinan Kamera/ });
  await entry.click();
  const panel = page.getByRole('dialog', { name: 'Perizinan', exact: true });
  await expect(panel.getByText('Perlu izin', { exact: true })).toHaveCount(2);
  expect(await page.evaluate(() => (window as unknown as { mediaCalls: number }).mediaCalls)).toBe(0);
  await panel.getByRole('button', { name: 'Izinkan kamera', exact: true }).click();
  await expect(panel.getByRole('region', { name: 'Kamera', exact: true }).getByText('Diizinkan', { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: /kamera/ })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { stoppedTracks: number }).stoppedTracks)).toBe(1);
  await panel.getByRole('button', { name: 'Izinkan mikrofon', exact: true }).click();
  await expect(panel.getByText('Diizinkan', { exact: true })).toHaveCount(2);
  await expect(panel.getByRole('button', { name: /mikrofon/ })).toHaveCount(0);
  await expect(panel.getByText(/berhasil diuji/)).toHaveCount(0);
  await expect(panel.getByRole('heading', { name: /Foto & lampiran|Papan klip|Notifikasi/ })).toHaveCount(0);
  await expect(panel.getByText('Cara mengubah atau mencabut izin', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { stoppedTracks: number }).stoppedTracks)).toBe(2);
  expect((await new AxeBuilder({ page }).include('.profile-permissions').analyze()).violations).toEqual([]);
  expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('permissions.png') });
  await page.keyboard.press('Escape');
  await expect(entry).toBeFocused();
});

test('Denied and unsupported queries remain truthful; live changes update status', async ({ page }) => {
  await page.addInitScript(() => {
    const permission = Object.assign(new EventTarget(), { state: 'denied' });
    Object.assign(window, { cameraPermission: permission });
    navigator.permissions.query = async ({ name }) => {
      if (name === ('microphone' as PermissionName)) throw new TypeError('Unsupported');
      return permission as PermissionStatus;
    };
    navigator.mediaDevices.getUserMedia = async () => { throw new Error('Must not access media'); };
  });
  await page.goto('/profil');
  await page.getByRole('button', { name: /Perizinan Kamera/ }).click();
  const panel = page.getByRole('dialog', { name: 'Perizinan', exact: true });
  await expect(panel.getByText('Diblokir', { exact: true })).toBeVisible();
  await expect(panel.getByText('Cek di browser', { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Izinkan kamera', exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    const permission = (window as unknown as { cameraPermission: EventTarget & { state: string } }).cameraPermission;
    permission.state = 'granted';
    permission.dispatchEvent(new Event('change'));
  });
  await expect(panel.getByText('Diizinkan', { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: /kamera/ })).toHaveCount(0);
});

test('Closing a pending request still releases a late media stream', async ({ page }) => {
  await page.addInitScript(() => {
    const counters = window as unknown as { stoppedTracks: number; finishMedia: () => void };
    counters.stoppedTracks = 0;
    navigator.permissions.query = async () => Object.assign(new EventTarget(), { state: 'prompt' }) as PermissionStatus;
    navigator.mediaDevices.getUserMedia = () => new Promise((resolve) => {
      counters.finishMedia = () => resolve({ getTracks: () => [{ stop: () => { counters.stoppedTracks++; } }] } as unknown as MediaStream);
    });
  });
  await page.goto('/profil');
  await page.getByRole('button', { name: /Perizinan Kamera/ }).click();
  await page.getByRole('button', { name: 'Izinkan kamera', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Menunggu izin…', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.evaluate(() => (window as unknown as { finishMedia: () => void }).finishMedia());
  await expect.poll(() => page.evaluate(() => (window as unknown as { stoppedTracks: number }).stoppedTracks)).toBe(1);
});
