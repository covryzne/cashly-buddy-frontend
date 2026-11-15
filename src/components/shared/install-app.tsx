'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  CircleCheck,
  EllipsisVertical,
  Monitor,
  PlusSquare,
  Share2,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useInstallEnvironment } from '@/lib/pwa/install-environment';

export function InstallGuide() {
  const environment = useInstallEnvironment();
  if (environment === 'unknown') return null;
  if (environment === 'standalone' || environment === 'installed')
    return (
      <p className="install-status" role="status">
        <CircleCheck size={20} />
        Cashly sudah siap di Home Screen kamu.
      </p>
    );
  const steps =
    environment === 'ios'
      ? [
          {
            Icon: Share2,
            title: 'Ketuk Bagikan',
            description: 'Di Safari, buka menu Bagikan pada halaman Cashly.',
          },
          {
            Icon: PlusSquare,
            title: 'Tambahkan ke Layar Utama',
            description:
              'Gulir pilihan Bagikan, lalu pilih Add to Home Screen.',
          },
          {
            Icon: Check,
            title: 'Aktifkan Buka sebagai App Web',
            description:
              'Jika pilihan ini muncul, aktifkan. Pastikan nama Cashly dan ikon Mochi, lalu ketuk Tambah.',
          },
        ]
      : environment === 'android'
        ? [
            {
              Icon: EllipsisVertical,
              title: 'Buka menu Chrome',
              description:
                'Ketuk menu tiga titik di Chrome saat membuka Cashly.',
            },
            {
              Icon: ArrowDownToLine,
              title: 'Pilih Instal aplikasi',
              description:
                'Pilihan ini juga bisa bernama Tambahkan ke layar utama.',
            },
            {
              Icon: Check,
              title: 'Konfirmasi pemasangan',
              description:
                'Periksa nama Cashly dan ikon Mochi, lalu pilih Instal atau Tambah.',
            },
          ]
        : [
            {
              Icon: Monitor,
              title: 'Buka melalui Chrome atau Edge',
              description:
                'Buka halaman Cashly pada browser yang ingin kamu gunakan.',
            },
            {
              Icon: ArrowDownToLine,
              title: 'Cari pilihan Instal',
              description:
                'Gunakan ikon instal di bilah alamat, atau pilihan instal di menu browser jika tersedia.',
            },
            {
              Icon: Check,
              title: 'Konfirmasi pemasangan',
              description:
                'Periksa nama Cashly dan ikon Mochi, lalu ikuti konfirmasi browser.',
            },
          ];
  return (
    <div className="install-guide">
      <div className="install-guide-app">
        <Image
          src="/icons/apple-touch-icon-mochi-3.png"
          alt="Ikon aplikasi Cashly"
          width={64}
          height={64}
        />
        <div>
          <span className="pill">
            <Smartphone size={12} />
            Home Screen
          </span>
          <h3>Cashly, lebih dekat.</h3>
          <p>Buka langsung dari ikon di perangkatmu.</p>
        </div>
      </div>
      {environment === 'ios' && (
        <p className="install-browser-note">
          Gunakan Safari di iPhone atau iPad. Jika membuka dari aplikasi lain,
          buka alamat Cashly di Safari terlebih dahulu.
        </p>
      )}
      <ol className="install-steps">
        {steps.map(({ Icon, title, description }, index) => (
          <li key={title}>
            <span className="install-step-icon">
              <Icon size={20} aria-hidden="true" />
            </span>
            <div>
              <span className="install-step-number">Langkah {index + 1}</span>
              <h4>{title}</h4>
              <p>{description}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="install-guide-note">
        Setelah ditambahkan, buka Cashly lewat ikon di layar utama. Nama menu
        bisa sedikit berbeda pada perangkatmu.
      </p>
    </div>
  );
}

export function InstallAppEntry({
  onOpen,
  className = '',
  showStatus = false,
  compact = false,
}: {
  onOpen?: () => void;
  className?: string;
  showStatus?: boolean;
  compact?: boolean;
}) {
  const environment = useInstallEnvironment();
  const [open, setOpen] = useState(false);
  if (environment === 'unknown') return null;
  if (environment === 'standalone' || environment === 'installed')
    return showStatus ? (
      <p className="install-status" role="status">
        <CircleCheck size={20} />
        {environment === 'standalone'
          ? 'Cashly dibuka dari Home Screen.'
          : 'Cashly sudah ditambahkan ke perangkatmu.'}
      </p>
    ) : null;
  return (
    <div
      className={`install-entry ${compact ? 'install-entry-compact' : ''} ${className}`}
    >
      <Button
        variant="secondary"
        data-modal-focus-key="install-cashly"
        onClick={() => (onOpen ? onOpen() : setOpen(true))}
      >
        <ArrowDownToLine size={18} />
        Install
      </Button>
      {!compact && <p>Akses lebih cepat dari layar utama perangkatmu.</p>}
      {open && (
        <Dialog
          title="Download Cashly"
          variant="sheet"
          className="install-dialog"
          onClose={() => setOpen(false)}
        >
          <InstallGuide />
        </Dialog>
      )}
    </div>
  );
}
