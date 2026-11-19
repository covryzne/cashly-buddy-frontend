"use client";
import { AppLoader } from "@/components/shared/app-loader";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Info,
  KeyRound,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { whatsappExample } from "@/mocks/fixtures/whatsapp";
import { useOnline } from "@/lib/pwa/connectivity";

function ExampleNotice() {
  return (
    <aside className="whatsapp-example-notice">
      <Info size={17} />
      <p>Pratinjau koneksi. OTP contoh belum mendaftarkan nomor WhatsApp.</p>
    </aside>
  );
}

export function WhatsappConnectIntro({
  onStart,
}: {
  onStart: (source: "chat" | "example") => void;
}) {
  const online = useOnline();
  const [availabilityValue, setAvailability] = useState<
    "loading" | "ready" | "missing" | "error"
  >("loading");
  const availability = online ? availabilityValue : "error";
  useEffect(() => {
    if (!online) return;
    const controller = new AbortController();
    fetch("/api/whatsapp/connect?mode=availability", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unavailable");
        const value = await response.json();
        if (!controller.signal.aborted)
          setAvailability(value.configured === true ? "ready" : "missing");
      })
      .catch(() => {
        if (!controller.signal.aborted) setAvailability("error");
      });
    return () => controller.abort();
  }, [online]);
  return (
    <div className="whatsapp-connect">
      <div className="whatsapp-connect-heading">
        <span>
          <MessageCircle size={27} />
        </span>
        <div>
          <h3>Catatanmu, lewat percakapan.</h3>
          <p>Hubungkan WhatsApp dengan kode dari bot Cashly.</p>
        </div>
      </div>
      <ExampleNotice />
      <ol className="whatsapp-connect-steps">
        <li>
          <span>1</span>
          <div>
            <strong>Buka chat bot Cashly</strong>
            <p>WhatsApp akan terbuka di tab atau aplikasi lain.</p>
          </div>
        </li>
        <li>
          <span>2</span>
          <div>
            <strong>Kirim permintaan OTP</strong>
            <p>
              Tekan kirim pada pesan yang disiapkan, lalu tunggu balasan kode
              dari bot.
            </p>
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            <strong>Kembali dan masukkan kode</strong>
            <p>Isi enam digit kode untuk meninjau alur koneksi.</p>
          </div>
        </li>
      </ol>
      <div className="whatsapp-connect-buttons">
        {availability === "ready" ? (
          <a
            className="button button-primary"
            href="/api/whatsapp/connect"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onStart("chat")}
            data-modal-focus-key="whatsapp-open"
          >
            <MessageCircle size={18} />
            Buka WhatsApp
            <ExternalLink size={15} />
          </a>
        ) : (
          <Button disabled>
            {availability === "loading" ? <AppLoader inline /> : <><MessageCircle size={18} />Buka WhatsApp</>}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => onStart("example")}
          data-modal-focus-key="whatsapp-example"
        >
          <KeyRound size={17} />
          Coba dengan OTP contoh
        </Button>
      </div>
      <p className="whatsapp-connect-hint" role="status">
        {availability === "missing"
          ? "Chat bot belum tersedia. Alur contoh tetap bisa dicoba."
          : availability === "error"
            ? "Chat belum dapat diperiksa. Coba alur contoh atau buka kembali nanti."
            : "Setelah chat dibuka, kembali ke Cashly untuk memasukkan kode."}
      </p>
    </div>
  );
}

export function WhatsappOtpForm({
  formId,
  expiresAt,
  source,
  onRestart,
  onVerified,
}: {
  formId: string;
  expiresAt: number;
  source: "chat" | "example";
  onRestart: () => void;
  onVerified: () => void;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [remaining, setRemaining] = useState(whatsappExample.ttlMs / 1000);
  useEffect(() => {
    const update = () =>
      setRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    const timer = window.setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  const expired = remaining === 0;
  const blocked = attempts >= whatsappExample.attempts;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (Date.now() >= expiresAt) {
      setRemaining(0);
      return;
    }
    if (blocked) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Masukkan enam digit kode OTP.");
      input.current?.focus();
      return;
    }
    if (code !== whatsappExample.code) {
      setAttempts((previous) => previous + 1);
      setError("Kode belum cocok. Periksa kembali kode contoh.");
      input.current?.focus();
      return;
    }
    setCode("");
    setError("");
    onVerified();
  }
  return (
    <div className="whatsapp-connect">
      <div className="whatsapp-connect-heading">
        <span>
          <KeyRound size={27} />
        </span>
        <div>
          <h3>Masukkan kode dari chat.</h3>
          <p>
            {source === "chat"
              ? "Kembali dari WhatsApp? Masukkan kode balasan bot di sini."
              : "Coba verifikasi dengan kode contoh di bawah."}
          </p>
        </div>
      </div>
      <ExampleNotice />
      <form
        id={formId}
        onSubmit={submit}
        noValidate
        className="whatsapp-otp-form"
      >
        <label htmlFor={inputId}>Kode OTP</label>
        <Input
          ref={input}
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
            setError("");
          }}
          placeholder="000000"
          aria-invalid={!!error || expired || blocked}
          aria-describedby={`${hintId} ${error || expired || blocked ? errorId : ""}`}
          disabled={expired || blocked}
          className="whatsapp-otp-input"
        />
        <p id={hintId}>
          Kode contoh: <strong>{whatsappExample.code}</strong>. Berlaku lima
          menit selama pratinjau.
        </p>
        <span className="whatsapp-otp-time">
          Sisa waktu {Math.floor(remaining / 60)}:
          {String(remaining % 60).padStart(2, "0")}
        </span>
        {(error || expired || blocked) && (
          <p id={errorId} className="whatsapp-otp-error" role="alert">
            {expired
              ? "Kode contoh sudah kedaluwarsa. Mulai ulang untuk mencoba lagi."
              : blocked
                ? "Batas percobaan contoh tercapai. Mulai ulang kode untuk mencoba lagi."
                : error}
          </p>
        )}
        <Button type="submit" disabled={expired || blocked}>
          <ShieldCheck size={17} />
          Sambungkan
        </Button>
      </form>
      <div className="whatsapp-connect-buttons">
        <Button
          variant="secondary"
          disabled={expired || blocked}
          onClick={() => {
            setCode(whatsappExample.code);
            setError("");
            input.current?.focus();
          }}
        >
          <Check size={17} />
          Isi kode contoh
        </Button>
        <Button variant="ghost" onClick={onRestart}>
          <RotateCcw size={16} />
          Mulai ulang kode
        </Button>
      </div>
      {source === "chat" && (
        <a
          className="whatsapp-chat-again"
          href="/api/whatsapp/connect"
          target="_blank"
          rel="noopener noreferrer"
        >
          Buka chat bot lagi
          <ExternalLink size={13} />
        </a>
      )}
    </div>
  );
}

export function WhatsappExampleConnected({ onReset }: { onReset: () => void }) {
  return (
    <div className="whatsapp-connect">
      <div className="whatsapp-connect-success">
        <span>
          <CheckCircle2 size={34} />
        </span>
        <span className="pill">Koneksi contoh</span>
        <h3>Alur koneksimu sudah siap.</h3>
        <p>
          Kode contoh cocok. Tampilan ini memperlihatkan hasil ketika WhatsApp
          berhasil dihubungkan.
        </p>
      </div>
      <aside className="whatsapp-example-notice">
        <ShieldCheck size={18} />
        <p>
          Belum ada nomor yang didaftarkan atau pesan yang disinkronkan. Status
          contoh hanya disimpan selama sesi ini.
        </p>
      </aside>
      <Button variant="outline" onClick={onReset}>
        <RotateCcw size={16} />
        Reset koneksi contoh
      </Button>
    </div>
  );
}
