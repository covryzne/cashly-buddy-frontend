"use client";
import { useEffect, useId, useState } from "react";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SettingsRow } from "@/components/shared/settings-row";
import { AuthPasswordField } from "@/features/auth/auth-password-field";
import { OtpCodeField } from "@/features/auth/otp-code-field";
import { passwordRules } from "@/features/auth/password-policy";
import { logoutGoogle } from "@/features/auth/session-boundary";
import { useOnline } from "@/lib/pwa/connectivity";
import { apiRequest } from "@/lib/finance";
import { useProfileSession } from "./profile-session";
import "@/styles/auth.css";

type Mode = "email" | "password";
type Challenge = { challenge_id: string; expires_at: string; current_email: string; new_email: string | null };

export function AccountSecurityPanel() {
  const { account, remoteMode } = useProfileSession();
  const [mode, setMode] = useState<Mode | null>(null);
  return <section className="profile-settings-section" aria-labelledby="account-security-title">
    <h2 id="account-security-title">Akun</h2>
    <div className="profile-settings-card">
      <SettingsRow icon={Mail} title="Ganti email" description={account.email} onClick={() => setMode("email")} />
      <SettingsRow icon={KeyRound} title={account.passwordLoginEnabled ? "Ganti kata sandi" : "Buat kata sandi Cashly"} description={account.passwordLoginEnabled ? "Login email/password sudah aktif" : "Aktifkan login email/password untuk akun yang sama"} onClick={() => setMode("password")} />
      <p className="profile-field-hint">Google: {account.googleConnected ? "Terhubung" : "Belum terhubung"} · Email/password: {account.passwordLoginEnabled ? "Aktif" : "Belum disiapkan"}</p>
    </div>
    {mode && <SecurityForm key={mode} mode={mode} available={remoteMode} onClose={() => setMode(null)} />}
  </section>;
}

function SecurityForm({ mode, available, onClose }: { mode: Mode; available: boolean; onClose: () => void }) {
  const { account } = useProfileSession();
  const online = useOnline();
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [token, setToken] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [currentConfirmed, setCurrentConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [sentAt, setSentAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 1000);
    window.addEventListener("focus", update);
    return () => { clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  const remaining = challenge ? Math.max(0, Math.ceil((Date.parse(challenge.expires_at) - now) / 1000)) : 300;
  const cooldown = Math.max(0, Math.ceil((sentAt + 60000 - now) / 1000));
  const title = mode === "email" ? "Ganti email" : account.passwordLoginEnabled ? "Ganti kata sandi" : "Buat kata sandi Cashly";
  async function send() {
    if (!online || pending || !available) return;
    if (mode === "email" && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().toLowerCase() === account.email.toLowerCase())) { setError("Masukkan email baru yang valid dan berbeda."); return; }
    if (mode === "password" && (passwordRules.some(rule => !rule.test(password)) || password.length > 16 || password !== confirm)) { setError("Gunakan kata sandi 8–16 karakter dengan huruf besar, kecil, angka, simbol, dan konfirmasi yang cocok."); return; }
    setPending(true); setError("");
    try {
      const result = await apiRequest(`me/security/${mode}/request`, "POST", mode === "email" ? { email: email.trim() } : {});
      setChallenge(result.data); setCurrentConfirmed(false); setToken("");
      const time = Date.now(); setSentAt(time); setNow(time);
    } catch (error) { setError(error instanceof Error ? error.message : "Kode belum dapat dikirim."); }
    finally { setPending(false); }
  }
  async function verify() {
    if (!challenge || !online || pending || token.length !== 6 || !remaining) return;
    setPending(true); setError("");
    try {
      const result = await apiRequest(`me/security/${mode}/verify`, "POST", {
        challenge_id: challenge.challenge_id, token,
        ...(mode === "email" ? { address: currentConfirmed ? "new" : "current" } : { password }),
      });
      setToken("");
      if (result.data.status === "confirmation_pending") setCurrentConfirmed(Boolean(result.data.confirmed_current));
      else { setDone(true); setPassword(""); setConfirm(""); }
    } catch (error) { setError(error instanceof Error ? error.message : "Verifikasi belum berhasil."); }
    finally { setPending(false); }
  }
  async function finish() {
    setPending(true); setError("");
    try { await logoutGoogle(); window.location.replace("/login"); }
    catch { setError("Perubahan tersimpan. Logout belum berhasil; coba lagi untuk masuk ulang."); setPending(false); }
  }
  if (done) return <Dialog title={mode === "email" ? "Email berhasil diubah" : account.passwordLoginEnabled ? "Kata sandi berhasil diubah" : "Kata sandi berhasil dibuat"} onClose={() => void finish()} showCloseButton={false} footer={<Button disabled={pending} onClick={() => void finish()}>Ke halaman login</Button>}>
    <ShieldCheck size={40} className="auth-success-icon" /><p>Perubahan akunmu sudah tersimpan. Silakan masuk kembali.</p>{error && <p role="alert" className="field-error">{error}</p>}
  </Dialog>;
  return <Dialog title={title} onClose={() => { if (!pending) onClose(); }}>
    <form className="login-form" onSubmit={event => { event.preventDefault(); void (challenge ? verify() : send()); }} aria-busy={pending}>
      {!available && <p role="status">Hubungkan ke akun online untuk menggunakan pengaturan ini.</p>}
      {!challenge ? <>
        {mode === "email" ? <div className="form-field"><label htmlFor={`${id}-email`}>Email baru</label><Input id={`${id}-email`} type="email" autoComplete="email" value={email} maxLength={254} onChange={event => { setEmail(event.target.value); setError(""); }} disabled={pending} required /><p className="caption">Konfirmasi diperlukan dari email lama dan email baru. Email akun tetap {account.email} sampai selesai.</p></div> : <>
          <AuthPasswordField id={`${id}-password`} name="newPassword" autoComplete="new-password" label="Kata sandi baru" value={password} onChange={value => { setPassword(value); setError(""); }} disabled={pending} />
          <AuthPasswordField id={`${id}-confirm`} name="confirmPassword" autoComplete="new-password" label="Konfirmasi kata sandi" value={confirm} onChange={value => { setConfirm(value); setError(""); }} disabled={pending} feedback={confirm ? { matches: password === confirm, text: password === confirm ? "Kata sandi cocok" : "Kata sandi belum cocok" } : undefined} />
          <p className="caption">8–16 karakter, huruf besar, huruf kecil, angka dan simbol. Kode dikirim ke {account.email}. Kata sandi Google tetap sama.</p>
        </>}
        <Button type="submit" disabled={!available || pending || !online}>{pending ? "Mengirim..." : "Kirim kode verifikasi"}</Button>
      </> : <>
        <p>{mode === "email" ? <>Masukkan kode dari <strong>{currentConfirmed ? challenge.new_email : challenge.current_email}</strong>. {currentConfirmed ? "Email lama sudah dikonfirmasi." : "Setelah ini, konfirmasi kode dari email baru."}</> : <>Masukkan kode yang dikirim ke <strong>{challenge.current_email}</strong>.</>}</p>
        <OtpCodeField id={`${id}-code`} label="Kode verifikasi akun" value={token} onChange={value => { setToken(value); setError(""); }} onError={setError} disabled={pending || remaining === 0} />
        <p className="caption">{remaining ? `Sisa waktu ${Math.floor(remaining / 60).toString().padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}` : "Kode kedaluwarsa. Kirim ulang untuk melanjutkan."}</p>
        <Button type="submit" disabled={pending || !online || token.length !== 6 || remaining === 0}>{pending ? "Memverifikasi..." : mode === "email" ? currentConfirmed ? "Verifikasi email baru" : "Verifikasi email lama" : "Simpan kata sandi"}</Button>
        <Button variant="secondary" disabled={pending || !online || cooldown > 0} onClick={() => void send()}>{cooldown ? `Kirim ulang dalam ${cooldown} detik` : "Kirim ulang kode"}</Button>
        <Button variant="ghost" disabled={pending} onClick={() => { setChallenge(null); setToken(""); setError(""); }}>{mode === "email" ? "Ubah email tujuan" : "Ubah kata sandi baru"}</Button>
      </>}
      {error && <p className="field-error" role="alert">{error}</p>}
      {!online && <p role="status">Hubungkan kembali internet untuk melanjutkan.</p>}
    </form>
  </Dialog>;
}
