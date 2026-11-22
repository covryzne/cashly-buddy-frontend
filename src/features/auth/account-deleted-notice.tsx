"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function AccountDeletedNotice() {
  const [open,setOpen]=useState(true);
  const router=useRouter();
  const close=()=>{setOpen(false);router.replace("/login");};
  return open ? <Dialog title="Akun berhasil dihapus" onClose={close} footer={<Button onClick={close}>Mengerti</Button>}><p>Akun dan data Cashly kamu sudah dihapus. Kamu telah keluar dari aplikasi.</p></Dialog> : null;
}
