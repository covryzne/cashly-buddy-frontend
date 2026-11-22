"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format/datetime";
import { whatsappHistorySchema, whatsappRequest, type WhatsappHistoryEntry } from "./whatsapp-api";

export function connectionTime(value: string) {
  return `${formatDate(value, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })} WIB`;
}

export function WhatsappHistory() {
  const id = useId();
  const [entry, setEntry] = useState<WhatsappHistoryEntry | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]);
    async function load() {
      try {
        const result = whatsappHistorySchema.parse(
          await whatsappRequest("/history?limit=1&event=linked", "GET", undefined, undefined, signal),
        );
        if (controller.signal.aborted) return;
        setEntry(result.data[0] ?? null);
        setState("ready");
      } catch {
        if (!controller.signal.aborted) setState("error");
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  return <section className="whatsapp-history" aria-labelledby={id}>
    <h4 id={id}>Terakhir terhubung</h4>
    {entry && <p>{entry.masked_number} · <time dateTime={entry.occurred_at}>{connectionTime(entry.occurred_at)}</time></p>}
    {state === "loading" && <p role="status">Memuat koneksi terakhir…</p>}
    {state === "ready" && !entry && <p>Belum ada riwayat koneksi WhatsApp yang tercatat.</p>}
    {state === "error" && <div className="whatsapp-history-error">
      <p role="status">Riwayat koneksi belum dapat dimuat.</p>
      <Button variant="ghost" onClick={() => { setState("loading"); setAttempt(count => count + 1); }}>Coba muat lagi</Button>
    </div>}
  </section>;
}
