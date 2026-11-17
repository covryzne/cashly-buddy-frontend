"use client";
import { AppLoader } from "@/components/shared/app-loader";
import { useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useOnline } from "@/lib/pwa/connectivity";
import { apiRequest } from "@/lib/finance";
import { googleConnectionSchema } from "@/lib/auth/types";

const messages: Record<string, string> = {
  connected: "Google berhasil dihubungkan. Kamu bisa masuk dengan Google atau email pada akun Cashly yang sama.",
  mismatch: "Email Google berbeda dari email Cashly. Koneksi dibatalkan. Pilih akun Google dengan email yang sesuai.",
  cleanup_failed: "Email Google berbeda dan koneksinya belum berhasil dilepas. Coba lagi nanti atau hubungi bantuan sebelum memakai login Google.",
  unavailable: "Google belum tersedia di lingkungan ini. Coba kembali setelah layanan Google diaktifkan.",
  failed: "Google belum berhasil dihubungkan. Pastikan memilih email yang sama, lalu coba lagi.",
};

export function GoogleConnection({ connected, email, available, onSetupPassword }: { connected: boolean; email: string; available: boolean; onSetupPassword: () => void }) {
  const online = useOnline();
  const router = useRouter();
  const params = useSearchParams();
  const result = params.get("google_link");
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [details, setDetails] = useState<ReturnType<typeof googleConnectionSchema.parse> | null>(null);
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const [disconnectDone, setDisconnectDone] = useState(false);
  const [error, setError] = useState("");
  const isConnected = connected && !disconnected;
  async function loadDetails() {
    setDetailOpen(true); setDetails(null); setError("");
    if (!online || !available) { setError("Hubungkan internet untuk memeriksa koneksi Google."); return; }
    setPending(true);
    try {
      const latest = googleConnectionSchema.parse((await apiRequest("me/security/google")).data);
      setDetails(latest); setDisconnected(!latest.connected);
    }
    catch (error) { setError(error instanceof Error ? error.message : "Koneksi Google belum dapat diperiksa."); }
    finally { setPending(false); }
  }
  async function disconnect() {
    if (pending || !online) return;
    setPending(true); setError("");
    try {
      const result = googleConnectionSchema.parse((await apiRequest("me/security/google/disconnect", "POST", {})).data);
      if (result.connected) throw new Error("Google belum berhasil dilepas. Periksa koneksi dan coba lagi.");
      setDisconnectConfirm(false); setDetailOpen(false); setDisconnected(true); setDisconnectDone(true);
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Google belum berhasil dilepas."); }
    finally { setPending(false); }
  }
  const closeResult = () => { setDismissed(true); router.replace("/profil", { scroll: false }); };
  return <>
    <div className="settings-row account-google-row">
      {isConnected ? <button type="button" className="account-google-trigger" aria-label="Detail koneksi Google" onClick={() => void loadDetails()}>
        <span className="settings-row-icon account-google-icon"><Image src="/branding/google-g.png" width={200} height={204} sizes="20px" style={{ width: 20, height: "auto" }} alt="" /></span>
        <span className="settings-row-copy"><strong>Google</strong><small>Login dengan Google</small></span>
        <span className="account-connection-status" data-connected="true"><Check size={12} aria-hidden="true" />Connected</span>
      </button> : <>
        <span className="settings-row-icon account-google-icon"><Image src="/branding/google-g.png" width={200} height={204} sizes="20px" style={{ width: 20, height: "auto" }} alt="" /></span>
        <span className="settings-row-copy"><strong>Google</strong><small>Disconnected</small></span>
        <div className="account-google-action"><Button variant="secondary" aria-label="Hubungkan Google" disabled={!available || !online} onClick={() => setConfirm(true)}>Hubungkan</Button></div>
      </>}
    </div>
    {detailOpen && !disconnectConfirm && <Dialog title="Koneksi Google" onClose={() => { if (!pending) setDetailOpen(false); }}>
      {pending ? <AppLoader /> : details ? <div className="google-connection-details">
        {!details.connected ? <p>Google sudah tidak terhubung.</p> : details.password_login_enabled ? <>
          <p>Password akun sudah dibuat.</p>
          <p>Yakin ingin melepaskan tautan Google <strong>{details.google_email ?? email}</strong>?</p>
        </> : <p>Password akun belum dibuat. Buat password terlebih dahulu sebelum melepaskan tautan Google agar kamu tetap bisa masuk.</p>}
        {details.connected && (details.can_disconnect ? <Button variant="outline" onClick={() => { setError(""); setDisconnectConfirm(true); }}>Lepaskan Google</Button> : !details.password_login_enabled ? <Button onClick={() => { setDetailOpen(false); onSetupPassword(); }}>Buat kata sandi Cashly</Button> : <p>Metode login email belum siap sebagai pengganti Google. Koneksi Google tetap dipertahankan.</p>)}
      </div> : <Button variant="secondary" onClick={() => void loadDetails()}>Coba lagi</Button>}
      {error && <p role="alert" className="field-error">{error}</p>}
    </Dialog>}
    {disconnectConfirm && <Dialog title="Lepaskan koneksi Google?" onClose={() => { if (!pending) setDisconnectConfirm(false); }} footer={<><Button variant="secondary" disabled={pending} onClick={() => setDisconnectConfirm(false)}>Batal</Button><Button disabled={pending || !online} onClick={() => void disconnect()}>{pending ? <AppLoader inline /> : "Ya, lepaskan Google"}</Button></>}>
      <p>Login dengan Google untuk <strong>{details?.google_email ?? email}</strong> akan berhenti berfungsi. Akun dan transaksi tetap tersimpan; kamu dapat masuk menggunakan email dan kata sandi Cashly.</p>
      {error && <p role="alert" className="field-error">{error}</p>}
    </Dialog>}
    {disconnectDone && <Dialog title="Google berhasil dilepas" onClose={() => setDisconnectDone(false)} footer={<Button onClick={() => setDisconnectDone(false)}>Selesai</Button>}><p>Kamu tetap dapat masuk dengan email dan kata sandi Cashly. Data akunmu tetap tersimpan.</p></Dialog>}
    {confirm && <Dialog title="Hubungkan akun Google" onClose={() => { if (!pending) setConfirm(false); }}>
      <p>Pilih akun Google dengan email <strong>{email}</strong>. Data dan akun Cashly kamu tetap sama.</p>
      <form action="/auth/google/connect" method="post" onSubmit={() => setPending(true)}>
        <Button type="submit" disabled={pending || !online}>{pending ? <AppLoader inline /> : "Lanjutkan ke Google"}</Button>
      </form>
    </Dialog>}
    {result && !dismissed && <Dialog title={result === "connected" && connected ? "Google berhasil terhubung" : "Koneksi Google belum selesai"} onClose={closeResult} footer={<Button onClick={closeResult}>Mengerti</Button>}>
      <p>{messages[result === "connected" && !connected ? "failed" : result] ?? messages.failed}</p>
    </Dialog>}
  </>;
}
