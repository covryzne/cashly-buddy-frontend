import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/auth-shell";
import { AccountDeletedNotice } from "@/features/auth/account-deleted-notice";
import { LoginForm } from "@/features/auth/login-form";
import { Suspense } from "react";
import { AppLoader } from "@/components/shared/app-loader";
import { connection } from "next/server";
import { providerConfig } from "@/lib/auth/config";

export const metadata: Metadata = { title: "Masuk ? Cashly" };

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; account?: string }> }) {
  return (
    <AuthShell mode="login">
      <Suspense fallback={<AppLoader />}><LoginContent searchParams={searchParams} /></Suspense>
    </AuthShell>
  );
}

async function LoginContent({ searchParams }: { searchParams: Promise<{ error?: string; account?: string }> }) {
  await connection();
  const { error, account } = await searchParams;
  const config = await providerConfig().catch(() => null);
  return <>{account==="deleted" && <AccountDeletedNotice />}<LoginForm error={error} googleEnabled={config?.googleEnabled} /></>;
}
