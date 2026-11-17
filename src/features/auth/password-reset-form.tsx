"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AppLoader } from "@/components/shared/app-loader";
import { useOnline } from "@/lib/pwa/connectivity";
import { AuthPasswordField } from "./auth-password-field";
import { PasswordRequirements } from "./password-requirements";
import { passwordRules } from "./password-policy";

export function PasswordResetForm({available,email,expiresAt}:{available:boolean;email?:string;expiresAt?:string}) {
  const id=useId();
  const online=useOnline();
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [pending,setPending]=useState(false);
  const [error,setError]=useState("");
  const [result,setResult]=useState("");
  const [deadline,setDeadline]=useState(expiresAt ? Date.parse(expiresAt) : 0);
  const [now,setNow]=useState(0);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const remaining=Math.min(300,Math.max(0,Math.ceil((deadline-now)/1000)));
  async function cancel() {
    if(pending) return;
    setPending(true);setError("");
    try {
      const response=await fetch("/auth/password/reset/cancel",{method:"POST",cache:"no-store",signal:AbortSignal.timeout(50000)});
      if(!response.ok) throw new Error("cancel");
      window.location.replace("/login");
    } catch {setError("Pembatalan belum berhasil. Coba lagi.");setPending(false);}
  }
  const finish=()=>window.location.replace("/login");
  async function submit() {
    if(pending || !online || !available || !remaining) return;
    if((passwordRules.some(rule=>!rule.test(password)) || password!==confirm)) {setError("Periksa syarat dan konfirmasi kata sandi baru.");return;}
    setPending(true);setError("");
    try {
      const response=await fetch("/auth/password/reset/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password}),cache:"no-store",signal:AbortSignal.timeout(50000)});
      const body=await response.json();
      if(body.expires_at) {setDeadline(Date.parse(body.expires_at));setNow(Date.now());}
      if(!response.ok) {setError(body.error ?? "Tautan tidak berlaku. Minta tautan baru.");return;}
      setPassword("");setConfirm("");setResult(body.status);
    } catch {setError("Layanan belum dapat dihubungi. Coba lagi.");}
    finally {setPending(false);}
  }
  if(!available) return <><p role="alert">Tautan tidak tersedia atau sudah berakhir.</p><Link className="text-button" href={"/forgot-password"}>Minta tautan baru</Link></>;
  return <>
    <form className="login-form password-reset-form" method="post" noValidate aria-busy={pending} onSubmit={event=>{event.preventDefault();void submit();}}>
      <>
        <p>Atur kata sandi untuk <strong>{email}</strong>.</p>
        <AuthPasswordField id={`${id}-password`} name="newPassword" label="Kata sandi baru" autoComplete="new-password" value={password} onChange={setPassword} disabled={pending} descriptionId={`${id}-requirements`} />
        <PasswordRequirements id={`${id}-requirements`} value={password} />
        <AuthPasswordField id={`${id}-confirm-password`} name="confirmPassword" label="Konfirmasi kata sandi" autoComplete="new-password" value={confirm} onChange={setConfirm} disabled={pending} feedback={confirm ? {matches:password===confirm,text:password===confirm ? "Kata sandi cocok" : "Kata sandi belum cocok"} : undefined} />
      </>
      {error && <><p role="alert" className="field-error">{error}</p><Link href={"/forgot-password"} className="text-button">Minta tautan baru</Link></>}
      <Button type="submit" disabled={pending || !online || Boolean(result) || !remaining}>{pending ? <AppLoader inline /> : "Simpan kata sandi baru"}</Button>
      <p className="caption">{remaining ? `Sisa waktu ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,"0")}` : "Sesi pemulihan sudah berakhir. Minta tautan baru."}</p>
      <Button variant="ghost" disabled={pending || !online || Boolean(result)} onClick={()=>void cancel()}>Batal</Button>
      {!online && <p role="status">Hubungkan internet untuk melanjutkan.</p>}
    </form>
    {result && <Dialog title={"Kata sandi berhasil disimpan"} onClose={finish} showCloseButton={false} footer={<Button onClick={finish}>Ke halaman login</Button>}><p>Perubahan tersimpan. Silakan masuk kembali ke akun Cashly.</p></Dialog>}
  </>;
}
