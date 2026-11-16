"use client";
import { GoogleSignInButton } from "./google-sign-in-button";
import { useOnline } from "@/lib/pwa/connectivity";
import { PasswordAuthForm } from "./password-auth-form";

export function LoginForm({ error, localEmail = false }: { error?: string; localEmail?: boolean }) {
  const online = useOnline();
  if (localEmail) return <PasswordAuthForm mode="login" />;
  const message = error === "configuration"
    ? "Google login belum siap. Periksa konfigurasi aplikasi dan provider."
    : error ? "Sesi belum tersedia. Silakan masuk kembali dengan Google." : null;
  return <>
    {message && <p className="field-error" role="alert">{message}</p>}
    <GoogleSignInButton />
    {!online && <p role="status">Hubungkan internet untuk melanjutkan dengan Google.</p>}
    <p className="muted">Gunakan akun Google untuk masuk atau membuat akun Cashly. Login email dan pemulihan kata sandi akan tersedia pada tahap berikutnya.</p>
  </>;
}
