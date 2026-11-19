"use client";
import { AppLoader } from "@/components/shared/app-loader";
import { useId, useState } from "react";
import Link from "next/link";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SettingsRow } from "@/components/shared/settings-row";
import { AuthPasswordField } from "@/features/auth/auth-password-field";
import { passwordRules } from "@/features/auth/password-policy";
import { PasswordRequirements } from "@/features/auth/password-requirements";
import { GoogleConnection } from "./google-connection";
import { DeleteAccount } from "./delete-account";
import { logoutGoogle } from "@/features/auth/session-boundary";
import { useOnline } from "@/lib/pwa/connectivity";
import { apiRequest } from "@/lib/finance";
import { useProfileSession } from "./profile-session";
import "@/styles/auth.css";

export function AccountSecurityPanel({onLogout}:{onLogout:()=>void}) {
  const { account, remoteMode } = useProfileSession();
  const [passwordOpen, setPasswordOpen] = useState(false);
  return <section className="profile-settings-section" aria-labelledby="account-security-title">
    <h2 id="account-security-title">Akun</h2>
    <div className="profile-settings-card">
      <GoogleConnection connected={account.googleConnected} email={account.email} available={remoteMode} onSetupPassword={() => setPasswordOpen(true)} />
      <SettingsRow icon={KeyRound} title={account.passwordLoginEnabled ? "Ganti kata sandi" : "Buat kata sandi Cashly"} description={account.passwordLoginEnabled ? "Kata sandi sudah dibuat. Login email/password aktif." : "Kata sandi belum dibuat. Tambahkan untuk login dengan email."} value={account.passwordLoginEnabled ? "Aktif" : "Belum dibuat"} onClick={() => setPasswordOpen(true)} />
    </div>
    {passwordOpen && <SecurityForm available={remoteMode} onClose={() => setPasswordOpen(false)} />}
    <div className="account-actions">
      <Button variant="outline" className="profile-logout" onClick={onLogout}><LogOut size={17} aria-hidden="true" />Keluar dari akun</Button>
      <DeleteAccount />
    </div>
  </section>;
}

function SecurityForm({available,onClose}:{available:boolean;onClose:()=>void}) {
  const {account}=useProfileSession();
  const online=useOnline();
  const id=useId();
  const [password,setPassword]=useState("");
  const [currentPassword,setCurrentPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [pending,setPending]=useState(false);
  const [error,setError]=useState("");
  const [done,setDone]=useState(false);
  const [sent,setSent]=useState(false);
  const [resendAt,setResendAt]=useState(0);
  const direct=account.passwordLoginEnabled;
  const title=direct ? "Ganti kata sandi" : "Buat kata sandi Cashly";
  async function submit() {
    if(pending || !online || !available) return;
    if(sent && Date.now()<resendAt) {setError("Tunggu 60 detik sebelum mengirim ulang.");return;}
    if(direct) {
      if(!currentPassword) {setError("Masukkan kata sandi saat ini.");return;}
      if(currentPassword===password) {setError("Kata sandi baru harus berbeda dari kata sandi saat ini.");return;}
      if(passwordRules.some(rule=>!rule.test(password)) || password!==confirm) {setError("Periksa syarat dan konfirmasi kata sandi baru.");return;}
    }
    setPending(true);setError("");
    try {
      const path=direct ? "password/change" : "password/setup/request";
      await apiRequest(`me/security/${path}`,"POST",direct ? {current_password:currentPassword,password} : {});
      if(direct) {setDone(true);setPassword("");setCurrentPassword("");setConfirm("");}
      else {setSent(true);setResendAt(Date.now()+60000);}
    } catch(error) {setError(error instanceof Error ? error.message : "Perubahan belum berhasil.");}
    finally {setPending(false);}
  }
  async function finish() {
    setPending(true);setError("");
    try {await logoutGoogle();window.location.replace("/login");}
    catch {setError("Perubahan tersimpan. Coba keluar lalu masuk kembali.");setPending(false);}
  }
  if(done) return <Dialog title="Kata sandi berhasil diubah" onClose={()=>void finish()} showCloseButton={false} footer={<Button disabled={pending} onClick={()=>void finish()}>{pending ? <AppLoader inline /> : "Ke halaman login"}</Button>}><ShieldCheck size={40} className="auth-success-icon" /><p>Silakan masuk kembali menggunakan kata sandi baru.</p>{error && <p role="alert" className="field-error">{error}</p>}</Dialog>;
  return <Dialog title={title} onClose={()=>{if(!pending)onClose();}}>
    <form className="login-form" method="post" noValidate aria-busy={pending} onSubmit={event=>{event.preventDefault();void submit();}}>
      {!available && <p role="status">Hubungkan ke akun online untuk menggunakan pengaturan ini.</p>}
      {sent ? <p role="status">Tautan untuk membuat kata sandi dikirim ke <strong>{account.email}</strong>. Buka tautan untuk melanjutkan.</p> : direct ? <>
        <AuthPasswordField id={`${id}-current-password`} name="currentPassword" label="Kata sandi saat ini" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} disabled={pending} labelAction={<Link className="text-button" href="/forgot-password">Lupa kata sandi?</Link>} />
        <AuthPasswordField id={`${id}-password`} name="newPassword" label="Kata sandi baru" autoComplete="new-password" value={password} onChange={setPassword} disabled={pending} descriptionId={`${id}-requirements`} />
        <PasswordRequirements id={`${id}-requirements`} value={password} />
        <AuthPasswordField id={`${id}-confirm-password`} name="confirmPassword" label="Konfirmasi kata sandi" autoComplete="new-password" value={confirm} onChange={setConfirm} disabled={pending} feedback={confirm ? {matches:password===confirm,text:password===confirm ? "Kata sandi cocok" : "Kata sandi belum cocok"} : undefined} />
      </> : <p>Kami akan mengirim tautan ke <strong>{account.email}</strong> untuk membuat kata sandi Cashly. Login Google tetap tersedia.</p>}
      {error && <p role="alert" className="field-error">{error}</p>}
      <Button type="submit" disabled={pending || !online || !available}>{pending ? <AppLoader inline /> : direct ? "Simpan kata sandi" : sent ? "Kirim ulang tautan" : "Kirim tautan konfirmasi"}</Button>
      {sent && <Button variant="ghost" onClick={onClose} disabled={pending}>Tutup</Button>}
      {!online && <p role="status">Hubungkan internet untuk melanjutkan.</p>}
    </form>
  </Dialog>;
}
