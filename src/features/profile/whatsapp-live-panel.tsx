"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, ExternalLink, Info, KeyRound, MessageCircle, RotateCcw, Unplug } from "lucide-react";
import { AppLoader } from "@/components/shared/app-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { whatsappChallengeSchema, whatsappConnectionSchema, whatsappRequest, type WhatsappConnection } from "./whatsapp-api";
import { connectionTime, WhatsappHistory } from "./whatsapp-history";

export function WhatsappLivePanel({ status, statusError, refresh, applyStatus }: {
  status: WhatsappConnection | null;
  statusError: string;
  refresh: () => Promise<WhatsappConnection | null>;
  applyStatus: (status: WhatsappConnection) => void;
}) {
  const challenge = status?.status === "connected" ? null : status?.challenge ?? null;
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  const requestKey = useRef<string | null>(null);
  const id = useId();
  useEffect(() => {
    alive.current = true;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { alive.current = false; clearInterval(timer); };
  }, []);
  const connected = status?.status === "connected";
  const expired = !!challenge && (Date.parse(challenge.expires_at) <= now || ["expired", "cancelled", "locked"].includes(challenge.state));
  const cooldown = challenge ? Math.max(0, Math.ceil((Date.parse(challenge.resend_at) - now) / 1000)) : 0;
  const remaining = challenge ? Math.max(0, Math.ceil((Date.parse(challenge.expires_at) - now) / 1000)) : 0;

  async function start() {
    if (busy) return;
    setBusy(true); setError("");
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    try {
      requestKey.current ??= crypto.randomUUID();
      const row = whatsappChallengeSchema.parse(await whatsappRequest("/challenges", "POST", undefined, requestKey.current));
      if (!alive.current) { popup?.close(); return; }
      requestKey.current = null;
      setCode(""); setNow(Date.now());
      applyStatus({ status: "not_linked", challenge: row, recording_available: false });
      if (popup) popup.location.replace(row.chat_url);
      await refresh();
    } catch (failure) {
      popup?.close();
      if (alive.current) setError(failure instanceof Error ? failure.message : "Kode belum dapat diminta.");
    } finally { if (alive.current) setBusy(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!challenge || busy || expired) return;
    if (!/^\d{6}$/.test(code)) { setError("Masukkan enam digit kode OTP."); input.current?.focus(); return; }
    setBusy(true); setError("");
    try {
      const result = whatsappConnectionSchema.parse(await whatsappRequest(`/challenges/${challenge.id}/verify`, "POST", { code }));
      if (result.status !== "connected") throw new Error("Koneksi belum terverifikasi.");
      if (alive.current) { setCode(""); applyStatus(result); }
      await refresh();
    } catch (failure) {
      if (alive.current) { setError(failure instanceof Error ? failure.message : "Kode belum dapat diverifikasi."); input.current?.focus(); }
      await refresh();
    } finally { if (alive.current) setBusy(false); }
  }

  async function disconnect() {
    setBusy(true); setError("");
    try {
      const result = whatsappConnectionSchema.parse(await whatsappRequest("", "DELETE"));
      if (alive.current) { setCode(""); setConfirmDisconnect(false); applyStatus(result); }
      await refresh();
    } catch (failure) {
      if (alive.current) setError(failure instanceof Error ? failure.message : "Koneksi belum diputuskan.");
    } finally { if (alive.current) setBusy(false); }
  }

  return <div className="whatsapp-connect">
    {!connected && <div className="whatsapp-connect-heading">
      <span aria-hidden="true">{challenge ? <KeyRound size={27} /> : <MessageCircle size={27} />}</span>
      <div><h3>{challenge ? "Masukkan kode dari chat" : "Hubungkan WhatsApp kamu"}</h3>
        <p>WhatsApp opsional. Kamu tetap bisa mencatat di Cashly.</p></div>
    </div>}
    {(error || statusError) && <p role="alert" className="whatsapp-otp-error">{error || statusError}</p>}
    {connected ? <>
      <section className="whatsapp-account" aria-labelledby={`${id}-account`}>
        <div className="whatsapp-account-top">
          <span className="whatsapp-account-icon"><MessageCircle size={21} aria-hidden="true" /></span>
          <span className="whatsapp-verified"><CheckCircle2 size={14} aria-hidden="true" />Terverifikasi</span>
        </div>
        <h3 id={`${id}-account`}>Nomor WhatsApp</h3>
        {status.masked_number && <p className="whatsapp-account-number">{status.masked_number}</p>}
        {status.connected_at && <dl className="whatsapp-account-meta">
          <div>
            <dt><Clock3 size={15} aria-hidden="true" />Terhubung sejak</dt>
            <dd><time dateTime={status.connected_at}>{connectionTime(status.connected_at)}</time></dd>
          </div>
        </dl>}
      </section>
      {!status.recording_available && <aside className="whatsapp-recording-note">
        <Info size={17} aria-hidden="true" />
        <div>
          <strong>Pencatatan WhatsApp masih disiapkan</strong>
          <p>Untuk sementara, catat pengeluaran di aplikasi Cashly.</p>
        </div>
      </aside>}
      {confirmDisconnect ? <div className="whatsapp-connect-buttons whatsapp-disconnect-confirm">
        <p>Putuskan koneksi nomor ini? Kamu perlu verifikasi lagi untuk menghubungkannya kembali.</p>
        <Button variant="outline" className="whatsapp-disconnect-action" disabled={busy} onClick={() => void disconnect()}><Unplug size={16} aria-hidden="true" />Ya, putuskan koneksi</Button>
        <Button variant="ghost" disabled={busy} onClick={() => setConfirmDisconnect(false)}>Batal</Button>
      </div> : <Button variant="outline" onClick={() => setConfirmDisconnect(true)}><Unplug size={16} aria-hidden="true" />Putuskan koneksi</Button>}
    </> : challenge ? <>
      <p>Kirim pesan yang sudah disiapkan di WhatsApp. Masukkan OTP dari balasan bot di sini. {challenge.masked_number ? `Tujuan kode: ${challenge.masked_number}.` : "Menunggu pesanmu ke bot."}</p>
      <form onSubmit={submit} noValidate className="whatsapp-otp-form">
        <label htmlFor={id}>Kode OTP</label>
        <Input ref={input} id={id} className="whatsapp-otp-input" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={6}
          value={code} onChange={event => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
          disabled={busy || expired} aria-invalid={!!error || expired} aria-describedby={`${id}-hint`} />
        <p id={`${id}-hint`}>{expired ? "Kode sudah berakhir. Minta kode baru untuk melanjutkan." : `Sisa waktu ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")} · ${challenge.attempts_remaining} percobaan tersisa.`}</p>
        <Button type="submit" disabled={busy || expired}>{busy ? <AppLoader inline /> : "Verifikasi dan sambungkan"}</Button>
      </form>
      <div className="whatsapp-connect-buttons">
        {!expired && <a className="button button-secondary" href={challenge.chat_url} target="_blank" rel="noopener noreferrer">Buka WhatsApp<ExternalLink size={15} /></a>}
        <Button variant="outline" disabled={busy || cooldown > 0} onClick={() => void start()}><RotateCcw size={16} />{cooldown > 0 ? `Minta kode baru dalam ${cooldown} detik` : "Minta kode baru"}</Button>
        <Button variant="ghost" disabled={busy} onClick={() => void refresh()}>Periksa status</Button>
      </div>
    </> : <>
      <ol className="whatsapp-connect-steps">
        <li><span>1</span><div><strong>Buka chat bot</strong><p>Cashly menyiapkan pesan koneksi. Tekan Kirim di WhatsApp.</p></div></li>
        <li><span>2</span><div><strong>Terima OTP</strong><p>Bot membalas kode ke nomor pengirim pesanmu.</p></div></li>
        <li><span>3</span><div><strong>Verifikasi di Cashly</strong><p>Kembali ke sini dan masukkan kode untuk menyelesaikan koneksi.</p></div></li>
      </ol>
      <Button disabled={busy} onClick={() => void start()}>{busy ? <AppLoader inline /> : <><MessageCircle size={17} />Buka WhatsApp</>}</Button>
      {statusError && <Button variant="ghost" disabled={busy} onClick={() => void refresh()}>Periksa status lagi</Button>}
    </>}
    {status?.status === "not_linked" && <WhatsappHistory />}
  </div>;
}
