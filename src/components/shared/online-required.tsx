"use client";

import type { ReactNode } from "react";
import { WifiOff } from "lucide-react";
import { useOnline } from "@/lib/pwa/connectivity";
import { Dialog } from "@/components/ui/dialog";

export function OnlineRequired({ children, onBack, onClose }: {
  children: ReactNode; onBack: () => void; onClose: () => void;
}) {
  const online = useOnline();
  if (online) return children;
  return <Dialog title="Perlu koneksi internet" onClose={onClose} onBack={onBack}>
    <div className="local-data-empty">
      <WifiOff aria-hidden="true" size={28} />
      <p>Pencatatan dan pemrosesan AI memerlukan koneksi. Kamu tetap bisa membaca data yang tersimpan di perangkat.</p>
      <p className="muted">Belum ada perubahan yang dikirim atau disimpan dari langkah ini.</p>
    </div>
  </Dialog>;
}
