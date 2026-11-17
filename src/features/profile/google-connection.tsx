"use client";
import { AppLoader } from "@/components/shared/app-loader";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useOnline } from "@/lib/pwa/connectivity";

const messages: Record<string, string> = {
  connected: "Google berhasil dihubungkan. Kamu bisa masuk dengan Google atau email pada akun Cashly yang sama.",
  mismatch: "Email Google berbeda dari email Cashly. Koneksi dibatalkan. Pilih akun Google dengan email yang sesuai.",
  cleanup_failed: "Email Google berbeda dan koneksinya belum berhasil dilepas. Coba lagi nanti atau hubungi bantuan sebelum memakai login Google.",
  unavailable: "Google belum tersedia di lingkungan ini. Coba kembali setelah layanan Google diaktifkan.",
  failed: "Google belum berhasil dihubungkan. Pastikan memilih email yang sama, lalu coba lagi.",
};

export function GoogleConnection({ connected, email, available }: { connected: boolean; email: string; available: boolean }) {
  const online = useOnline();
  const router = useRouter();
  const params = useSearchParams();
  const result = params.get("google_link");
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const closeResult = () => { setDismissed(true); router.replace("/profil", { scroll: false }); };
  return <>
    {!connected && <div className="account-google-action"><Button variant="secondary" aria-label="Hubungkan Google" disabled={!available || !online} onClick={() => setConfirm(true)}>Hubungkan</Button></div>}
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
