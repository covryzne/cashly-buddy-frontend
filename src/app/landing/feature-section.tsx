import Image from 'next/image';
import { Tabs } from '@base-ui/react/tabs';
import {
  ChartNoAxesColumn,
  Flame,
  MessageCircle,
  Mic,
  ReceiptText,
  Shield,
} from 'lucide-react';
import { evolutionStages } from '@/features/profile/profile-model';
import { formatMoney } from '@/lib/format/money';
import styles from './landing.module.css';

const captureModes = [
  {
    id: 'scan',
    label: 'Scan Struk',
    hint: 'Foto struknya, beres.',
    icon: ReceiptText,
    result: 'Draf dari struk',
    merchant: 'Alfamart Senopati',
    detail: 'Susu oat dan roti bakar',
    amount: 38500,
  },
  {
    id: 'voice',
    label: 'Voice Note',
    hint: 'Ceritain aja, Mochi yang catet.',
    icon: Mic,
    result: 'Draf dari suara',
    merchant: 'Batagor Kuah & Es Teh',
    detail: '“Beli batagor dan es teh 20 ribu.”',
    amount: 20000,
  },
  {
    id: 'manual',
    label: 'Chat',
    hint: 'Ketik nominalnya sendiri, sat-set.',
    icon: MessageCircle,
    result: 'Contoh catatan manual',
    merchant: 'Bensin Pertalite',
    detail: 'Kategori Transportasi',
    amount: 30000,
  },
];

export function FeatureSection() {
  return (
    <section
      className={`${styles.container} ${styles.section}`}
      id="fitur"
      aria-labelledby="judul-fitur"
    >
      <div className={styles.splitIntro}>
        <h2 id="judul-fitur">Buat kamu yang males input manual ribet</h2>
        <p>
          Hidup udah rame, jangan ditambah ribet. Pilih cara catat paling
          sat-set buatmu, cek drafnya, baru simpan.
        </p>
      </div>

      <div className={styles.featureGrid}>
        <article
          id="cara-kerja"
          className={`${styles.glass} ${styles.featureCard} ${styles.capture}`}
        >
          <h3>3 cara catat kilat, pilih gayamu</h3>
          <p>Cobain tiap cara, liat contoh catatannya.</p>
          <Tabs.Root defaultValue="scan">
            <Tabs.List
              className={styles.demoTabs}
              aria-label="Contoh cara mencatat pengeluaran"
            >
              {captureModes.map(({ id, label, hint, icon: Icon }) => (
                <Tabs.Tab key={id} value={id} className={styles.demoTab}>
                  <Icon size={20} aria-hidden />
                  <strong>{label}</strong>
                  <small>{hint}</small>
                </Tabs.Tab>
              ))}
            </Tabs.List>
            {captureModes.map(
              ({ id, result, merchant, detail, amount, icon: Icon }) => (
                <Tabs.Panel key={id} value={id} className={styles.demoPanel}>
                  <span className={`${styles.iconTile} ${styles.lavender}`}>
                    <Icon size={20} aria-hidden />
                  </span>
                  <div>
                    <p className={styles.kicker}>{result}</p>
                    <strong>{merchant}</strong>
                    <small>{detail}</small>
                  </div>
                  <strong className={styles.demoAmount}>
                    −{formatMoney(String(amount))}
                  </strong>
                </Tabs.Panel>
              ),
            )}
          </Tabs.Root>
        </article>

        <article
          className={`${styles.glass} ${styles.featureCard} ${styles.freeze}`}
        >
          <span className={`${styles.iconTile} ${styles.peach}`}>
            <Flame size={23} aria-hidden />
          </span>
          <h3>Streak Freeze Anti-Guilt</h3>
          <p>
            Hari sibuk bikin lupa catat? Santai, kalau Freeze kamu masih ada,
            streak tetap aman.
          </p>
          <div className={styles.freezeNote}>
            <Shield size={17} aria-hidden /> Freeze tersedia di aplikasi
          </div>
        </article>

        <article className={`${styles.featureCard} ${styles.report}`}>
          <ChartNoAxesColumn size={24} aria-hidden />
          <h3>Ke Mana Uangmu Pergi?</h3>
          <p>
            Lihat rekap bulanan sama kategori pengeluaranmu. Dari jajan kecil
            sampai ongkos, semua gampang dibaca.
          </p>
          <div className={styles.reportNote}>
            <span>Contoh kategori terbesar</span>
            <strong>Makan &amp; minum</strong>
          </div>
        </article>

        <article
          id="gamifikasi"
          className={`${styles.glass} ${styles.featureCard} ${styles.evolution}`}
        >
          <p className={styles.kicker}>Evolusi Mochi</p>
          <h3>Makin Konsisten Mencatat, Mochi Makin Keren</h3>
          <p>Mochi ikut tumbuh seiring kamu membangun kebiasaan mencatat.</p>
          <ol className={styles.stages}>
            {evolutionStages.map((stage) => (
              <li key={stage.stage}>
                <Image
                  src={
                    stage.stage === 1
                      ? '/mascot/mochi-level-1-transparent.png'
                      : stage.stage === 5
                        ? '/mascot/mochi-crown-transparent.webp'
                        : stage.image
                  }
                  alt=""
                  width={64}
                  height={64}
                />
                <strong>{stage.name}</strong>
                <small>
                  {stage.days === 0 ? 'Sejak awal' : `${stage.days} hari`}
                </small>
              </li>
            ))}
          </ol>
        </article>
      </div>
    </section>
  );
}
