import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/auth-shell";
import { GoogleSignInButton } from "@/features/auth/google-sign-in-button";
import { providerConfig } from "@/lib/auth/config";
import { PasswordAuthForm } from "@/features/auth/password-auth-form";
import { Suspense } from "react";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Buat akun · Cashly" };

export default function RegisterPage() {
  return (
    <AuthShell mode="register">
      <Suspense fallback={<p role="status">Menyiapkan form...</p>}><RegisterContent /></Suspense>
    </AuthShell>
  );
}

async function RegisterContent() {
  await connection();
  const config = await providerConfig().catch(() => null);
  return <>
    {config?.googleEnabled && <>
      <p className="login-google-intro">Cepat pakai akun Google kamu</p>
      <GoogleSignInButton />
      <div className="auth-divider"><span>atau pakai email</span></div>
    </>}
    <PasswordAuthForm mode="register" />
  </>;
}
