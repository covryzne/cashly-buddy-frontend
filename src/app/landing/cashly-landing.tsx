import Image from 'next/image';
import { Dialog } from '@base-ui/react/dialog';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { InstallAppEntry } from '@/components/shared/install-app';
import {
  ArrowRight,
  Menu,
  ShieldCheck,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { FeatureSection } from './feature-section';
import { InstallSection, Questions } from './guide-sections';
import { ProductPreview } from './product-preview';
import styles from './landing.module.css';

const navigation = [
  { href: '#fitur', label: 'Fitur' },
  { href: '#cara-kerja', label: 'Cara Kerja' },
  { href: '#pwa-install', label: 'Pasang di HP' },
  { href: '#gamifikasi', label: 'Mochi' },
  { href: '#faq', label: 'FAQ' },
];

function BrandMark() {
  return (
    <>
      <Image className={styles.brandLight} src="/branding/header-light.png" alt="" width={36} height={36} />
      <Image className={styles.brandDark} src="/branding/header-dark.png" alt="" width={36} height={36} />
      <span>Cashly</span>
    </>
  );
}

function Brand() {
  return (
    <a href="#awal" className={styles.brand}>
      <BrandMark />
    </a>
  );
}

export function CashlyLanding() {
  return (
    <div className={styles.landing} id="awal">
      <a href="#konten-landing" className={styles.skip}>
        Lewati ke konten
      </a>
      <header className={styles.header}>
        <nav
          className={`${styles.nav} ${styles.glass} ${styles.container}`}
          aria-label="Navigasi utama"
        >
          <Brand />
          <ul className={styles.navLinks}>
            {navigation.map(({ href, label }) => (
              <li key={href}>
                <a href={href}>{label}</a>
              </li>
            ))}
          </ul>
          <div className={styles.navControls}>
            <InstallAppEntry compact showMobilePlatforms />
            <ThemeToggle />
          </div>
          <Dialog.Root>
            <Dialog.Trigger className={styles.mobileMenuTrigger} aria-label="Menu navigasi">
              <Menu size={20} aria-hidden />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Popup className={styles.mobileMenu}>
                <Dialog.Title className="sr-only">Menu navigasi Cashly</Dialog.Title>
                <div className={styles.mobileMenuHeader}>
                  <Dialog.Close className={styles.brand} nativeButton={false} render={<a href="#awal" role="link" />}>
                    <BrandMark />
                  </Dialog.Close>
                  <div className={styles.menuControls}>
                    <ThemeToggle />
                    <Dialog.Close className={styles.mobileMenuClose} aria-label="Tutup menu">
                      <X size={20} aria-hidden />
                    </Dialog.Close>
                  </div>
                </div>
                <nav aria-label="Navigasi mobile">
                  <ul className={styles.mobileMenuLinks}>
                    {navigation.map(({ href, label }) => (
                      <li key={href}>
                        <Dialog.Close nativeButton={false} render={<a href={href} role="link" />}>
                          {label}
                        </Dialog.Close>
                      </li>
                    ))}
                  </ul>
                </nav>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </nav>
      </header>

      <main id="konten-landing" className={styles.main} tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="judul-landing">
          <div className={styles.container}>
            <div className={styles.heroCopy}>
              <a
                href="#cara-kerja"
                className={`${styles.chip} ${styles.heroChip}`}
              >
                <span aria-hidden /> Scan, ngomong, atau ketik — beres.
              </a>
              <h1 id="judul-landing">
                Jajan boleh. Boncos jangan.
                <span>Catat pengeluaran tanpa beban, tanpa drama.</span>
              </h1>
              <p>
                Semua pengeluaran ke-track, dari kopi sampai checkout. Scan
                struk, voice note, atau ketik sendiri, Mochi yang beresin.
              </p>
              <div className={styles.actions}>
                <a
                  href="/launch"
                  className={`${styles.button} ${styles.primary}`}
                >
                  Gas, mulai catat!
                </a>
                <a
                  href="#cara-kerja"
                  className={`${styles.button} ${styles.glass}`}
                >
                  Cara Kerjanya
                </a>
              </div>
              <ul className={styles.heroNotes} aria-label="Keunggulan Cashly">
                <li className={styles.chip}>
                  <ShieldCheck size={15} aria-hidden /> Nggak perlu login bank
                </li>
                <li className={styles.chip}>
                  <WifiOff size={15} aria-hidden /> Offline juga jalan
                </li>
                <li className={styles.chip}>
                  <Smartphone size={15} aria-hidden /> Pasang di home screen
                </li>
              </ul>
            </div>
            <ProductPreview />
          </div>
        </section>

        <FeatureSection />
        <InstallSection />
        <Questions />

        <section className={styles.ctaSection} aria-labelledby="judul-mulai">
          <div className={`${styles.container} ${styles.cta}`}>
            <div>
              <h2 id="judul-mulai">Saatnya baikan sama dompetmu.</h2>
              <p>
                Mulai dari pengeluaran hari ini. Buka Cashly di browser, Mochi
                udah nungguin!
              </p>
            </div>
            <a
              href="/launch"
              className={`${styles.button} ${styles.ctaButton}`}
            >
              Gas, buka Cashly! <ArrowRight size={18} aria-hidden />
            </a>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div className={styles.footerIntro}>
              <Brand />
              <p>
                Bestie buat nyatet pengeluaran harian, satu langkah kecil tiap
                hari.
              </p>
            </div>
            <div>
              <h2>Produk</h2>
              <ul>
                <li>
                  <a href="#fitur">Catat pengeluaran</a>
                </li>
                <li>
                  <a href="#cara-kerja">Cara kerja</a>
                </li>
                <li>
                  <a href="#gamifikasi">Streak &amp; Mochi</a>
                </li>
              </ul>
            </div>
            <div>
              <h2>Bantuan</h2>
              <ul>
                <li>
                  <a href="#pwa-install">Cara pasang di HP</a>
                </li>
                <li>
                  <a href="#faq">Yang sering ditanyain</a>
                </li>
              </ul>
            </div>
            <div>
              <h2>Akun</h2>
              <ul>
                <li>
                  <a href="/launch">Buka Cashly</a>
                </li>
                <li>
                  <a href="/register">Buat akun</a>
                </li>
              </ul>
            </div>
          </div>
          <p className={styles.copyright}>© 2026 Cashly Indonesia.</p>
        </div>
      </footer>
    </div>
  );
}
