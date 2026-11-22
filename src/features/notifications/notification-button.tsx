"use client";

import { useState } from "react";
import { Bell, CheckCheck, ChevronRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format/datetime";
import { useOnline } from "@/lib/pwa/connectivity";
import { notifications, readNotification, type Inbox, type NotificationItem } from "./notification-api";
import { useNotificationInbox } from "./inbox-provider";
import styles from "./notifications.module.css";

export function NotificationButton() {
  const router = useRouter();
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const cache = useNotificationInbox();
  const inbox = cache?.inbox;
  const [older, setOlder] = useState<Inbox>();
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState(false);
  const unread = inbox?.unread_count ?? 0;
  const error = actionError || cache?.error;
  const cursor = (older ?? inbox)?.next_cursor;
  const items = [
    ...(inbox?.items ?? []),
    ...(older?.items.filter((item) => !inbox?.items.some((current) => current.id === item.id)) ?? []),
  ];

  function showInbox() {
    setActionError("");
    setOpen(true);
    cache?.refresh();
  }

  function closeInbox() {
    setOpen(false);
    setOlder(undefined);
  }

  async function perform(action: () => Promise<void>) {
    setPending(true);
    setActionError("");
    try { await action(); }
    catch (failure) { setActionError((failure as Error).message); }
    finally { setPending(false); }
  }

  function markAll() {
    void perform(async () => {
      await notifications("/read-all", { method: "POST" });
      cache?.markAllLocally();
      const readAt = new Date().toISOString();
      setOlder((current) => current && ({
        ...current,
        items: current.items.map((item) => item.read_at ? item : { ...item, read_at: readAt }),
      }));
    });
  }

  function clearInbox() {
    void perform(async () => {
      await notifications("", { method: "DELETE" });
      setOlder(undefined);
      cache?.clearLocally();
    });
  }

  function choose(item: NotificationItem) {
    void perform(async () => {
      if (!item.read_at) {
        await readNotification(item.id);
        cache?.refresh(true);
      }
      closeInbox();
      router.push("/beranda?catat=1");
    });
  }

  function loadMore() {
    if (!cursor) return;
    void perform(async () => {
      const page = await notifications<Inbox>(`?before=${encodeURIComponent(cursor)}`);
      setOlder((current) => ({
        ...page,
        items: [...(current?.items ?? inbox?.items ?? []), ...page.items],
      }));
    });
  }

  return (
    <>
      <button
        type="button"
        className={`icon-button ${styles.bell}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
        onClick={showInbox}
      >
        <Bell size={21} aria-hidden="true" />
        {unread > 0 && <span className={styles.dot} aria-hidden="true" />}
      </button>
      {open && (
        <Dialog title="Notifikasi" variant="sheet" onClose={closeInbox}>
          <div className={styles.stack}>
            {!online ? <p role="status">Sambungkan internet untuk membuka riwayat notifikasi.</p> : (
              <>
                {error && <p role="alert">{error}</p>}
                {error && !inbox && <Button variant="secondary" onClick={() => cache?.refresh(true)}>Coba lagi</Button>}
                {!inbox && !error && <p role="status">Lagi memuat notifikasi…</p>}
                {inbox && items.length === 0 && <p role="status">Belum ada notifikasi.</p>}
                {items.length > 0 && (
                  <div className={styles.inboxActions}>
                    {unread > 0 && (
                      <Button variant="secondary" disabled={pending} onClick={markAll}>
                        <CheckCheck size={17} aria-hidden="true" /> Tandai semua dibaca
                      </Button>
                    )}
                    <Button variant="secondary" className={styles.clearInbox} disabled={pending} onClick={clearInbox}>
                      <Trash2 size={17} aria-hidden="true" /> Bersihkan notifikasi
                    </Button>
                  </div>
                )}
                {items.length ? (
                  <ul className={styles.list}>
                    {items.map((item) => (
                      <li key={item.id}>
                        <button type="button" className={styles.item} data-unread={!item.read_at}
                          disabled={pending} onClick={() => choose(item)}>
                          <span>
                            <strong>{item.title}</strong>
                            <span>{item.body}</span>
                            <small>{formatDate(item.created_at, { dateStyle: "medium", timeStyle: "short" })}
                              {!item.read_at && " · Belum dibaca"}
                            </small>
                          </span>
                          <ChevronRight size={17} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {cursor && <Button variant="secondary" disabled={pending} onClick={loadMore}>Muat lebih banyak</Button>}
              </>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
