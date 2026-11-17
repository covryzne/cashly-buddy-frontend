"use client";
import { AppLoader } from "@/components/shared/app-loader";

import { useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, UserRound, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useOnline } from "@/lib/pwa/connectivity";
import { AuthPasswordField } from "./auth-password-field";
import { loginSchema } from "./login-schema";
import { registerSchema } from "./register-schema";
import { PasswordRequirements } from "./password-requirements";
import { EmailVerificationForm } from "./email-verification-form";

const subscribe = () => () => {};

export function PasswordAuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const fieldPrefix = useId();
  const register = mode === "register";
  const online = useOnline();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const form = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [verification, setVerification] = useState<{ email: string; issuedAt: number | null } | null>(null);
  const [created, setCreated] = useState<"registered" | "verified" | null>(null);
  const disabled = pending || !hydrated;
  const finishRegistration = () => {
    setCreated(null);
    router.replace("/login");
  };
  const change = (key: keyof typeof values, value: string) => {
    setValues(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: "", form: "" }));
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!online || pending) return;
    const parsed = (register ? registerSchema : loginSchema).safeParse(values);
    if (!parsed.success) {
      const issues: Record<string, string> = {};
      for (const issue of parsed.error.issues) issues[String(issue.path[0])] ??= issue.message;
      setErrors(issues);
      const first = (["name", "email", "password", "confirmPassword"] as const).find(key => issues[key]);
      form.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({}); setPending(true);
    try {
      const response = await fetch(`/auth/email/${mode}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(register ? values : { email: values.email, password: values.password }),
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) { setErrors({ form: result.error ?? "Proses masuk belum berhasil. Coba lagi." }); return; }
      if (result.status === "verification_required") {
        setVerification({ email: values.email.trim(), issuedAt: register ? Date.now() : null });
        setValues({ name: "", email: "", password: "", confirmPassword: "" });
        return;
      }
      if (register && result.status === "registered") {
        setValues({ name: "", email: "", password: "", confirmPassword: "" });
        setCreated(result.status);
        return;
      }
      setValues({ name: "", email: "", password: "", confirmPassword: "" });
      window.location.assign(result.redirect === "/auth/complete" ? "/auth/complete" : "/beranda");
    } catch { setErrors({ form: "Tidak dapat menghubungi layanan login lokal. Periksa koneksi dan coba lagi." }); }
    finally { setPending(false); }
  }
  if (verification) return <EmailVerificationForm email={verification.email} issuedAt={verification.issuedAt} onVerified={() => { setVerification(null); setCreated("verified"); }} onBack={() => setVerification(null)} />;
  return <>
    <form ref={form} className="login-form" method="post" action={`/auth/email/${mode}`} onSubmit={submit} noValidate aria-busy={pending}>
      {register && <div className="form-field"><label htmlFor={`${fieldPrefix}-name`}>Nama panggilan</label><div className="input-wrap"><UserRound size={19} aria-hidden="true" /><Input id={`${fieldPrefix}-name`} name="name" placeholder="Masukkan nama panggilanmu" autoComplete="nickname" value={values.name} onChange={event => change("name", event.target.value)} disabled={disabled} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${fieldPrefix}-name-error` : undefined} /></div>{errors.name && <p id={`${fieldPrefix}-name-error`} className="field-error">{errors.name}</p>}</div>}
      <div className="form-field"><label htmlFor={`${fieldPrefix}-email`}>Email</label><div className="input-wrap"><Mail size={19} aria-hidden="true" /><Input id={`${fieldPrefix}-email`} name="email" type="email" placeholder="nama@email.com" autoComplete="email" value={values.email} onChange={event => change("email", event.target.value)} disabled={disabled} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? `${fieldPrefix}-email-error` : undefined} /></div>{errors.email && <p id={`${fieldPrefix}-email-error`} className="field-error">{errors.email}</p>}</div>
      <AuthPasswordField id={`${fieldPrefix}-password`} name="password" autoComplete={register ? "new-password" : "current-password"} label="Kata sandi" value={values.password} onChange={value => change("password", value)} error={errors.password} disabled={disabled} descriptionId={register ? `${fieldPrefix}-requirements` : undefined} />
      {register && <PasswordRequirements id={`${fieldPrefix}-requirements`} value={values.password} />}
      {register && <AuthPasswordField id={`${fieldPrefix}-confirm-password`} name="confirmPassword" autoComplete="new-password" label="Konfirmasi kata sandi" value={values.confirmPassword} onChange={value => change("confirmPassword", value)} error={values.confirmPassword ? undefined : errors.confirmPassword} disabled={disabled} feedback={values.confirmPassword ? { matches: values.password === values.confirmPassword, text: values.password === values.confirmPassword ? "Kata sandi cocok" : "Kata sandi belum cocok" } : undefined} />}
      {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
      {!online && <p role="status">Hubungkan kembali koneksi untuk melanjutkan.</p>}
      <Button type="submit" className="auth-full-button" disabled={!online || disabled}>{pending ? <AppLoader inline /> : register ? "Buat akun" : "Masuk"}</Button>
    </form>
    <p className="login-register">{register ? "Sudah punya akun? " : "Belum punya akun? "}<Link className="text-button" href={register ? "/login" : "/register"}>{register ? "Masuk" : "Buat akun"}</Link></p>
    {created && <Dialog title={created === "verified" ? "Akun telah terverifikasi" : "Akun berhasil dibuat"} onClose={finishRegistration} showCloseButton={false} className="auth-success-dialog" footer={<Button autoFocus className="auth-full-button" onClick={finishRegistration}>Ke halaman login</Button>}>
      <CircleCheck className="auth-success-icon" size={44} aria-hidden="true" />
      <p>{created === "verified" ? "Emailmu berhasil diverifikasi. Silakan masuk ke Cashly menggunakan email dan kata sandimu." : "Akunmu sudah siap. Silakan masuk menggunakan email dan kata sandi yang baru dibuat."}</p>
    </Dialog>}
  </>;
}
