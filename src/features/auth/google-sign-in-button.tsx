"use client";
import { AppLoader } from "@/components/shared/app-loader";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/pwa/connectivity";
import { clearAccountSnapshot } from "@/lib/pwa/account-snapshot";

export function GoogleSignInButton() {
  const [pending, setPending] = useState(false);
  const online = useOnline();
  return <form action="/auth/google" method="post" onSubmit={async event => {
    event.preventDefault(); if (pending) return;
    const form = event.currentTarget; setPending(true);
    try { void clearAccountSnapshot().catch(() => undefined); form.submit(); }
    catch { setPending(false); }
  }}>
    <Button type="submit" variant="outline" className="google-sign-in" disabled={!online || pending}>
      {!pending && <Image src="/branding/google-g.png" width={200} height={204} sizes="20px" style={{ width: 20, height: "auto" }} alt="" />}
      {pending ? <AppLoader inline /> : "Lanjutkan dengan Google"}
    </Button>
  </form>;
}
