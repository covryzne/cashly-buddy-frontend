'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Mic, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Device = 'camera' | 'microphone';
type Access = PermissionState | 'unknown' | 'unavailable' | 'checking';
const labels: Record<Access, string> = {
  granted: 'Diizinkan', denied: 'Diblokir', prompt: 'Perlu izin',
  unknown: 'Cek di browser', unavailable: 'Tidak tersedia', checking: 'Memeriksa…',
};
const devices = [
  { name: 'camera', title: 'Kamera', Icon: Camera, description: 'Mengambil foto struk saat kamu membuka kamera di fitur Scan struk.' },
  { name: 'microphone', title: 'Mikrofon', Icon: Mic, description: 'Merekam voice note saat kamu mulai merekam pengeluaran.' },
] as const;

export function PermissionsPanel() {
  const [access, setAccess] = useState<Record<Device, Access>>({ camera: 'checking', microphone: 'checking' });
  const [busy, setBusy] = useState<Device | null>(null);
  const [message, setMessage] = useState('');
  const refresh = useRef<() => void>(() => {});
  const active = useRef(false);
  const requesting = useRef(false);

  useEffect(() => {
    active.current = true;
    let disposed = false;
    let generation = 0;
    let listeners: (() => void)[] = [];
    const update = async () => {
      const current = ++generation;
      listeners.forEach((remove) => remove());
      listeners = [];
      await Promise.all(devices.map(async ({ name }) => {
        let state: Access = 'unknown';
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) state = 'unavailable';
        else {
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            const permission = await Promise.race([
              navigator.permissions.query({ name: name as PermissionName }),
              new Promise<undefined>((resolve) => { timer = setTimeout(() => resolve(undefined), 1500); }),
            ]);
            if (disposed || current !== generation) return;
            if (permission) {
              state = permission.state;
              const change = () => setAccess((previous) => ({ ...previous, [name]: permission.state }));
              permission.addEventListener('change', change);
              listeners.push(() => permission.removeEventListener('change', change));
            }
          } catch { /* Some browsers do not expose media permission status. */ }
          finally { clearTimeout(timer); }
        }
        if (!disposed && current === generation) setAccess((previous) => ({ ...previous, [name]: state }));
      }));
    };
    refresh.current = () => { void update(); };
    const visible = () => { if (!document.hidden) void update(); };
    window.addEventListener('focus', refresh.current);
    document.addEventListener('visibilitychange', visible);
    void update();
    const onFocus = refresh.current;
    return () => {
      disposed = true;
      active.current = false;
      listeners.forEach((remove) => remove());
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);

  async function request(name: Device) {
    if (requesting.current) return;
    requesting.current = true;
    setBusy(name);
    setMessage('');
    let granted = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: name === 'camera', audio: name === 'microphone' });
      // This is only an access check: never record, preview, or upload media here.
      stream.getTracks().forEach((track) => track.stop());
      granted = true;
      if (active.current) setAccess((previous) => ({ ...previous, [name]: 'granted' }));
    } catch (error) {
      if (!active.current) return;
      const code = error instanceof Error ? error.name : '';
      setMessage(code === 'NotAllowedError' || code === 'SecurityError'
        ? 'Akses belum diizinkan. Periksa izin situs dan izin aplikasi browser di pengaturan perangkatmu.'
        : code === 'NotFoundError'
          ? 'Perangkat tidak ditemukan. Sambungkan kamera atau mikrofon lalu coba lagi.'
          : 'Akses belum bisa digunakan. Perangkat mungkin sedang dipakai aplikasi lain. Coba lagi setelah menutupnya.');
    } finally {
      requesting.current = false;
      if (active.current) { setBusy(null); if (!granted) refresh.current(); }
    }
  }

  return <div className="profile-permissions">
    <p>Lihat izin untuk browser dan perangkat ini, serta alasan Cashly memakainya. Status izin bukan penanda perangkat sedang aktif.</p>
    {devices.map(({ name, title, Icon, description }) => <section className="profile-permission-item" key={name} aria-label={title}>
      <div className="profile-permission-heading"><Icon size={20} aria-hidden="true" /><h3>{title}</h3><span className="profile-permission-status" data-state={access[name]}>{labels[access[name]]}</span></div>
      <p>{description}</p>
      {access[name] === 'denied' ? <small>Ubah izin melalui pengaturan situs di browser, lalu kembali ke Cashly.</small>
        : access[name] === 'unavailable' ? <small>Buka Cashly melalui HTTPS atau browser yang mendukung akses perangkat.</small>
        : access[name] !== 'granted' && <Button variant="secondary" disabled={busy !== null || access[name] === 'checking'} onClick={() => void request(name)}>
          {busy === name ? 'Menunggu izin…' : `Izinkan ${title.toLowerCase()}`}
        </Button>}
    </section>)}
    <p role="status">{message}</p>
    <section className="profile-permission-item" aria-label="Penggunaan data">
      <div className="profile-permission-heading"><ShieldCheck size={20} aria-hidden="true" /><h3>Akses & penggunaan data</h3></div>
      <p>Foto struk dan voice note dikirim untuk dianalisis. Hasilnya bisa kamu tinjau sebelum disimpan.</p>
      <p>Cashly memakai data akun dan pengeluaran untuk catatanmu, serta penyimpanan perangkat untuk fitur offline dan tema. Tidak meminta akses lokasi atau kontak.</p>
    </section>
    <Button variant="secondary" onClick={() => refresh.current()}><RefreshCw size={16} />Perbarui status izin</Button>
  </div>;
}
