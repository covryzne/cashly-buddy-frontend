"use client";
import { GoogleSignInButton } from "./google-sign-in-button";
import { PasswordAuthForm } from "./password-auth-form";

export function LoginForm({ error, googleEnabled = false }: { error?: string; googleEnabled?: boolean }) {
  const message = error === "configuration"
    ? "Google login belum siap. Periksa konfigurasi aplikasi dan provider."
    : error ? "Sesi belum tersedia. Silakan masuk kembali dengan Google." : null;
  return <>
    {message && <p className="field-error" role="alert">{message}</p>}
    {googleEnabled && <>
      <p className="login-google-intro">Cepat pakai akun Google kamu</p>
      <GoogleSignInButton />
      <div className="auth-divider"><span>atau pakai email</span></div>
    </>}
    <PasswordAuthForm mode="login" />
  </>;
}
