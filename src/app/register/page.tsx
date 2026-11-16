import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/auth-shell";
import { RegisterForm } from "@/features/auth/register-form";
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
  return process.env.CASHLY_ENV === "dev" ? <PasswordAuthForm mode="register" /> : <RegisterForm />;
}
