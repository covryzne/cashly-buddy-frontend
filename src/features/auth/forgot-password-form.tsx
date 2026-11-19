"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLoader } from "@/components/shared/app-loader";
import { useOnline } from "@/lib/pwa/connectivity";
import { forgotPasswordSchema } from "./forgot-password-schema";

export function ForgotPasswordForm() {
  const online = useOnline();
  const id = useId();
  const [email,setEmail] = useState("");
  const [sent,setSent] = useState(false);
  const [pending,setPending] = useState(false);
  const [error,setError] = useState("");
  const [resendAt,setResendAt] = useState(0);
  const [now,setNow] = useState(0);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()),1000); return () => clearInterval(timer); },[]);
  const cooldown = Math.max(0,Math.ceil((resendAt-now)/1000));
  async function send() {
    if(pending || !online || (sent && cooldown)) return;
    const parsed = forgotPasswordSchema.safeParse({email});
    if(!parsed.success) { setError("Masukkan email yang valid."); return; }
    setPending(true); setError("");
    try {
      const response = await fetch("/auth/password/reset/request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(parsed.data),cache:"no-store",signal:AbortSignal.timeout(50000)});
      const result = await response.json();
      if(!response.ok) { setError(result.error ?? "Tautan belum dapat dikirim."); return; }
      setSent(true); const time=Date.now(); setNow(time); setResendAt(time+60000);
    } catch { setError("Layanan belum dapat dihubungi. Coba lagi."); }
    finally { setPending(false); }
  }
  return <><form className="login-form forgot-password-form" method="post" noValidate aria-busy={pending} onSubmit={event=>{event.preventDefault();void send();}}>
    {sent ? <p role="status">Jika email <strong>{email}</strong> terdaftar, tautan untuk mengatur kata sandi akan dikirim ke inbox tersebut. Periksa juga folder spam.</p> : <div className="form-field"><label htmlFor={`${id}-email`}>Email</label><Input id={`${id}-email`} type="email" autoComplete="email" value={email} maxLength={254} placeholder="nama@email.com" disabled={pending} onChange={event=>{setEmail(event.target.value);setError("");}} required /></div>}
    {error && <p role="alert" className="field-error">{error}</p>}
    <Button type="submit" disabled={pending || !online || (sent && cooldown>0)}>{pending ? <AppLoader inline /> : sent ? cooldown ? `Kirim ulang dalam ${cooldown} detik` : "Kirim ulang tautan" : "Kirim tautan reset"}</Button>
    {sent && <Button variant="ghost" disabled={pending} onClick={()=>{setSent(false);setError("");}}>Gunakan email lain</Button>}
    {!online && <p role="status">Hubungkan internet untuk melanjutkan.</p>}
  </form><p className="login-register"><Link className="text-button" href="/login">Kembali ke masuk</Link></p></>;
}
