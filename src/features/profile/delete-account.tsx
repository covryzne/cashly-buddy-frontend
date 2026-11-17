"use client";
import { useId, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { AppLoader } from "@/components/shared/app-loader";
import { AuthPasswordField } from "@/features/auth/auth-password-field";
import { clearSnapshot } from "@/lib/pwa/local-snapshot";
import { useOnline } from "@/lib/pwa/connectivity";
import { useProfileSession } from "./profile-session";

export function DeleteAccount() {
  const {account,remoteMode}=useProfileSession();
  const online=useOnline();
  const id=useId();
  const [open,setOpen]=useState(false);
  const [confirmation,setConfirmation]=useState("");
  const [password,setPassword]=useState("");
  const [pending,setPending]=useState(false);
  const [deleted,setDeleted]=useState(false);
  const [error,setError]=useState("");
  const close=()=>{if(pending)return;setOpen(false);setPassword("");setConfirmation("");setError("");};
  async function finish() {
    setPending(true);setError("");
    try {
      await clearSnapshot();
      try {localStorage.setItem("cashly-auth-logout",String(Date.now()));} catch { /* cross-tab session checks remain */ }
      const channel=typeof BroadcastChannel!=="undefined" ? new BroadcastChannel("cashly-auth") : null;
      channel?.postMessage("account_deleted");channel?.close();
      window.location.replace("/login?account=deleted");
    } catch {setError("Akun sudah dihapus. Pembersihan data lokal belum selesai; coba lagi.");setPending(false);}
  }
  async function submit() {
    if(pending || !online || !remoteMode) return;
    if(confirmation!=="HAPUS AKUN") {setError("Ketik HAPUS AKUN untuk melanjutkan.");return;}
    if(account.passwordLoginEnabled && !password) {setError("Masukkan kata sandi saat ini.");return;}
    setPending(true);setError("");
    try {
      const response=await fetch("/auth/account/delete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirmation,...(account.passwordLoginEnabled ? {current_password:password} : {})}),cache:"no-store",signal:AbortSignal.timeout(50000)});
      const body=await response.json();
      if(!response.ok) {setError(body.error ?? "Akun belum dapat dihapus.");setPending(false);return;}
      setPassword("");setDeleted(true);await finish();
    } catch {setError("Penghapusan belum dapat dipastikan. Coba masuk kembali untuk memeriksa akun.");setPending(false);}
  }
  return <>
    <Button variant="ghost" className="account-delete-trigger" disabled={!remoteMode || !online} onClick={()=>setOpen(true)}><Trash2 size={16} aria-hidden="true" />Hapus akun</Button>
    {open && <Dialog title={deleted ? "Akun sudah dihapus" : "Hapus akun permanen?"} onClose={close} showCloseButton={!pending && !deleted}>
      {deleted ? <><p>Data akun di server sudah dihapus. Selesaikan pembersihan data pada perangkat ini.</p>{error && <p role="alert" className="field-error">{error}</p>}<Button disabled={pending} onClick={()=>void finish()}>{pending ? <AppLoader inline /> : "Selesaikan dan ke login"}</Button></> : <form className="login-form" method="post" noValidate aria-busy={pending} onSubmit={event=>{event.preventDefault();void submit();}}>
        <p>Akun Cashly <strong>{account.email}</strong>, profil, seluruh transaksi dan rincian, streak, hero, serta progres akan dihapus permanen. Penghapusan tidak bisa dibatalkan.</p>
        {account.googleConnected && <p>Penghapusan ini hanya menghapus akun Cashly, bukan akun Google kamu.</p>}
        {account.passwordLoginEnabled && <AuthPasswordField id={`${id}-password`} name="currentPassword" autoComplete="current-password" label="Kata sandi saat ini" value={password} onChange={setPassword} disabled={pending} />}
        <div className="form-field"><label htmlFor={`${id}-confirmation`}>Ketik HAPUS AKUN</label><Input id={`${id}-confirmation`} autoComplete="off" value={confirmation} onChange={event=>setConfirmation(event.target.value)} disabled={pending} required /></div>
        {error && <p role="alert" className="field-error">{error}</p>}
        <Button type="submit" className="account-delete-confirm" disabled={pending || !online}>{pending ? <AppLoader inline /> : "Hapus akun permanen"}</Button>
        <Button variant="ghost" disabled={pending} onClick={close}>Batal</Button>
      </form>}
    </Dialog>}
  </>;
}
