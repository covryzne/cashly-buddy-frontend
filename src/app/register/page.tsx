import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/auth-shell";
import { GoogleSignInButton } from "@/features/auth/google-sign-in-button";
import { providerConfig } from "@/lib/auth/config";
import { PasswordAuthForm } from "@/features/auth/password-auth-form";
import { Suspense } from "react";
import { AppLoader } from "@/components/shared/app-loader";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Buat akun · Cashly" };

export default function RegisterPage() {
  return (
    <AuthShell mode="register">
      <Suspense fallback={<AppLoader />}><RegisterContent /></Suspense>
    </AuthShell>
  );
}

async function RegisterContent() {
  await connection();
  const config = await providerConfig().catch(() => null);
  return <>
    {config?.googleEnabled && <>
      <p className="login-google-intro">Paling sat-set pakai Google</p>
      <GoogleSignInButton />
      <div className="auth-divider"><span>atau daftar pakai email</span></div>
    </>}
    <PasswordAuthForm mode="register" />
  </>;
}
