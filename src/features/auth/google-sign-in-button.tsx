"use client";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/pwa/connectivity";

export function GoogleSignInButton() {
  const [pending, setPending] = useState(false);
  const online = useOnline();
  return <form action="/auth/google" method="post" onSubmit={() => setPending(true)}>
    <Button type="submit" variant="outline" className="google-sign-in" disabled={!online || pending}>
      <Image src="/branding/google-g.png" width={200} height={204} sizes="20px" style={{ width: 20, height: "auto" }} alt="" />
      {pending ? "Menghubungkan ke Google..." : "Lanjutkan dengan Google"}
    </Button>
  </form>;
}
