import { AuthShell } from "@/features/auth/auth-shell";
import { PasswordResetForm } from "@/features/auth/password-reset-form";
import { recoveryPageState } from "@/lib/auth/password-reset";
import { Suspense } from "react";
import { AppLoader } from "@/components/shared/app-loader";
export const metadata={title:"Atur kata sandi · Cashly",referrer:"no-referrer" as const};
async function Form() {
  const proof=await recoveryPageState();
  return <PasswordResetForm available={Boolean(proof)} email={proof?.email} expiresAt={proof?.expires_at} />;
}
export default function ResetPasswordPage() { return <AuthShell mode="reset-password"><Suspense fallback={<AppLoader />}><Form /></Suspense></AuthShell>; }
