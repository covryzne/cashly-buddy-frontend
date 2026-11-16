import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/auth-shell";
import { LoginForm } from "@/features/auth/login-form";
import { Suspense } from "react";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Masuk ? Cashly" };

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <AuthShell mode="login">
      <Suspense fallback={<p role="status">Menyiapkan form...</p>}><LoginContent searchParams={searchParams} /></Suspense>
    </AuthShell>
  );
}

async function LoginContent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const { error } = await searchParams;
  return <LoginForm error={error} localEmail={process.env.CASHLY_ENV === "dev"} />;
}
