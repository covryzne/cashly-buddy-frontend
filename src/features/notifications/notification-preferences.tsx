"use client";

import { useState } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/pwa/connectivity";
import { useInstallEnvironment } from "@/lib/pwa/install-environment";
import { disableDevicePush, notifications, type NotificationPreferences } from "./notification-api";
import type { useNotificationSettings } from "./use-notification-settings";
import styles from "./notifications.module.css";

export function NotificationPreferencesPanel({
  settings,
  allowPushTest,
  fixedReminderSchedule,
}: {
  settings: ReturnType<typeof useNotificationSettings>;
  allowPushTest: boolean;
  fixedReminderSchedule: boolean;
}) {
  const online = useOnline();
  const install = useInstallEnvironment();
  const { preferences: saved, permission, registration, supported } = settings;
  const [draft, setDraft] = useState<Partial<Pick<NotificationPreferences, "daily_enabled" | "reminder_time">>>({});
  const preferences = saved && { ...saved, ...draft };
  const scheduledByCashly = fixedReminderSchedule || Boolean(saved?.production_reminder_times);
  const subscribed = Boolean(saved?.push_active);
  const active = subscribed && (!scheduledByCashly || Boolean(saved?.daily_enabled));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function saveReminder(enabled: boolean, time?: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await notifications<NotificationPreferences>("/preferences", {
        method: "PATCH",
        body: JSON.stringify({ daily_enabled: enabled, reminder_time: time }),
      });
      const { daily_enabled, reminder_time, production_reminder_times } = next;
      settings.update({ daily_enabled, reminder_time, production_reminder_times });
      setDraft({});
      setNotice("Preferensi pengingat tersimpan.");
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function togglePush() {
    if (!registration || !preferences?.push_public_key) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (active) {
        await disableDevicePush();
        settings.update({ push_active: false }, {});
        setNotice("Notifikasi di perangkat ini sudah dimatikan.");
      } else {
        // Calling subscribe directly from the click preserves the browser's user gesture.
        const base64 = preferences.push_public_key.replace(/-/g, "+").replace(/_/g, "/");
        const applicationServerKey = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
        const keys = subscription.toJSON().keys;
        if (!keys?.p256dh || !keys.auth) throw new Error("Notifikasi belum bisa diaktifkan. Coba lagi.");
        let dailyEnabled: boolean | undefined;
        try {
          const result = await notifications<{ active: boolean; daily_enabled?: boolean }>("/push", {
            method: "POST", body: JSON.stringify({ endpoint: subscription.endpoint, ...keys }),
          });
          dailyEnabled = result.daily_enabled;
        } catch (failure) {
          if (!subscribed) await subscription.unsubscribe().catch(() => false);
          throw failure;
        }
        settings.update({
          push_active: true,
          ...(dailyEnabled === undefined ? {} : { daily_enabled: dailyEnabled }),
        }, { endpoint: subscription.endpoint });
        setNotice(dailyEnabled
          ? "Notifikasi dan pengingat harian sudah aktif."
          : "Notifikasi sudah aktif di perangkat ini.");
      }
    } catch (failure) {
      setError(Notification.permission === "denied"
        ? "Izin notifikasi diblokir. Kamu bisa mengubahnya di pengaturan perangkat."
        : (failure as Error).message);
    } finally {
      setBusy(false);
      settings.setPermission(Notification.permission);
    }
  }

  async function sendTest() {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) throw new Error("Aktifkan notifikasi di perangkat ini dulu.");
      const result = await notifications<{ delay_seconds: number }>("/push/test", {
        method: "POST", body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      setNotice(`Tes dijadwalkan dalam sekitar ${result.delay_seconds} detik. Kamu bisa tutup Cashly sekarang.`);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!online) return <p role="status">Sambungkan internet untuk mengatur notifikasi.</p>;
  if (!preferences) return settings.error
    ? <div className={styles.stack}><p role="alert">{settings.error}</p><Button variant="secondary" onClick={() => settings.refresh(true)}>Coba lagi</Button></div>
    : <p role="status">Lagi memuat pengaturan…</p>;

  const savedChanges = saved?.daily_enabled !== preferences.daily_enabled ||
    saved?.reminder_time !== preferences.reminder_time;
  const canTogglePush = install !== "ios" && supported && !!registration &&
    !!preferences.push_public_key && (permission !== "denied" || active);
  const pushHint = install === "ios" ? "Pasang dan buka Cashly dari Layar Utama untuk mengaktifkan notifikasi."
    : !supported ? "Notifikasi belum didukung di perangkat atau browser ini."
    : !preferences.push_public_key ? "Notifikasi perangkat belum tersedia saat ini."
    : permission === "denied" ? "Izin diblokir. Ubah lewat pengaturan notifikasi di perangkatmu."
    : !registration ? "Cashly sedang menyiapkan notifikasi di perangkat ini."
    : active ? scheduledByCashly ? "Notifikasi dan pengingat harian sudah aktif." : "Notifikasi aktif di perangkat ini."
    : "Aktifkan supaya pengingat juga muncul saat Cashly ditutup.";

  return (
    <div className={styles.stack}>
      {!scheduledByCashly && <form className={styles.settingsCard} onSubmit={(event) => {
        event.preventDefault();
        void saveReminder(preferences.daily_enabled, preferences.reminder_time);
      }}>
        <label className={styles.settingLine}>
          <span><strong>Pengingat catat harian</strong><small>Mochi ngingetin sesuai jam yang kamu pilih.</small></span>
          <input type="checkbox" role="switch" checked={preferences.daily_enabled} disabled={busy}
            onChange={(event) => {
              const enabled = event.target.checked;
              setDraft({ ...draft, daily_enabled: enabled });
            }} />
        </label>
        {preferences.daily_enabled && (
          <label className={styles.settingLine}>
            <strong>Jam pengingat (WIB)</strong>
            <input type="time" value={preferences.reminder_time} required disabled={busy}
              onChange={(event) => setDraft({ ...draft, reminder_time: event.target.value })} />
          </label>
        )}
        <Button type="submit" disabled={busy || !savedChanges}>Simpan pengingat</Button>
      </form>}
      <div className={styles.settingsCard}>
        <div><strong>Notifikasi di perangkat ini</strong><small>{pushHint}</small></div>
        {canTogglePush && (
          <Button variant="secondary" disabled={busy} onClick={() => void togglePush()}>
            {active ? <BellOff size={18} aria-hidden="true" /> : <Bell size={18} aria-hidden="true" />}
            {active ? "Matikan notifikasi" : "Aktifkan notifikasi"}
          </Button>
        )}
        {allowPushTest && preferences.test_push_available && (
          <Button variant="secondary" disabled={busy || !canTogglePush || !active || permission !== "granted"}
            onClick={() => void sendTest()}>
            <Send size={17} aria-hidden="true" /> Kirim notifikasi tes
          </Button>
        )}
      </div>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
