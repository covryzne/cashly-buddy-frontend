export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type Inbox = {
  items: NotificationItem[];
  unread_count: number;
  next_cursor: string | null;
};

export type NotificationPreferences = {
  daily_enabled: boolean;
  reminder_time: string;
  production_reminder_times?: string[] | null;
  push_public_key: string | null;
  push_active?: boolean;
  test_push_available?: boolean;
};

export class NotificationRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function notifications<T>(path = "", init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/cashly/notifications${path}`, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new NotificationRequestError(
      payload?.error?.message ?? "Notifikasi belum bisa dimuat. Coba lagi.",
      response.status,
    );
  }
  return (await response.json()).data;
}

export async function loadNotificationPreferences(endpoint: string | undefined, signal: AbortSignal) {
  if (!endpoint) return notifications<NotificationPreferences>("/preferences", { signal });
  const request = { method: "POST", body: JSON.stringify({ endpoint }), signal };
  try {
    return await notifications<NotificationPreferences>("/preferences/device", request);
  } catch (error) {
    if (!(error instanceof NotificationRequestError) || error.status !== 404) throw error;
    // Keep preferences available while the old backend is still being replaced.
    const [preferences, push] = await Promise.all([
      notifications<NotificationPreferences>("/preferences", { signal }),
      notifications<{ active: boolean }>("/push/status", request),
    ]);
    return { ...preferences, push_active: push.active };
  }
}

export function readNotification(id: string, signal?: AbortSignal) {
  return notifications(`/${id}/read`, { method: "POST", signal });
}

export async function disableDevicePush() {
  if (!navigator.serviceWorker) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) return;
  try {
    await notifications("/push", {
      method: "DELETE",
      body: JSON.stringify({ endpoint: subscription.endpoint }),
      signal: AbortSignal.timeout(2500),
    });
  } catch (error) {
    if (!await subscription.unsubscribe()) throw error;
    return;
  }
  await subscription.unsubscribe().catch(() => false);
}
