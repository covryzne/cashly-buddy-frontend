import { Accordion } from '@base-ui/react/accordion';
import {
  ChevronDown,
  Coffee,
  Globe,
  ReceiptText,
  Share,
  Smartphone,
  TrainFront,
} from 'lucide-react';
import styles from './landing.module.css';

const installSteps = [
  {
    title: 'Buka aplikasi Cashly',
    description: 'Mulai dari browser HP. Pakai Safari di iPhone atau Chrome di Android.',
    icon: Globe,
    note: 'Safari atau Chrome',
    tone: 'lavender',
  },
  {
    title: 'Pasang Cashly di home screen',
    description:
      'Di Safari, pilih Bagikan. Di Chrome, buka menu tiga titik. Terus pilih Tambahkan ke Layar Utama atau Instal aplikasi.',
    icon: Share,
    note: 'Add to Home Screen',
    tone: 'peach',
  },
  {
    title: 'Tinggal tap ikon Cashly',
    description:
      'Buka aplikasinya dari ikon Cashly. Login dan buka catatanmu pas online supaya catatan yang udah ke-load bisa dibaca lagi pas offline.',
    icon: Smartphone,
    note: 'Akses cepat dari home screen',
    tone: 'mint',
  },
] as const;

const examples = [
  {
    title: 'Ngopi sebelum kuliah',
    text: 'Abis bayar, sebutin nominalnya lewat voice note. Cek drafnya, baru simpan.',
    icon: Coffee,
    tone: 'peach',
  },
  {
    title: 'Belanja bulanan',
    text: 'Foto struk belanja, cek hasil bacaannya, baru masukin ke catatan.',
    icon: ReceiptText,
    tone: 'mint',
  },
  {
    title: 'Pulang naik MRT',
    text: 'Catat ongkosnya manual, terus liat total transportasi di laporan bulanan.',
    icon: TrainFront,
    tone: 'lavender',
  },
] as const;

const questions = [
  {
    title: 'Cashly perlu akses rekening bank nggak?',
    answer:
      'Nggak. Kamu bisa langsung pakai Cashly tanpa menghubungkan rekening atau memasukkan kredensial bank. Kamu sendiri yang pilih pengeluaran mana yang mau dicatat.',
  },
  {
    title: 'Pengguna Cashly lain bisa lihat transaksiku nggak?',
    answer:
      'Nggak. Transaksi dan laporan di aplikasi Cashly hanya bisa dibuka dari akun pemiliknya. Cashly memakai Row Level Security (RLS) di Supabase untuk membatasi akses data per akun, termasuk untuk transaksi yang kamu catat lewat WhatsApp.',
  },
  {
    title: 'Siapa yang bisa lihat pesan yang kukirim lewat WhatsApp?',
    answer:
      'Pesanmu masuk ke inbox WhatsApp Business Cashly dan diproses oleh bot untuk mencatat transaksi. Pengelola Cashly bisa membuka percakapan di inbox bisnis untuk membantu kalau kamu menghubungi support atau ada kendala pencatatan.',
  },
  {
    title: 'Apa yang terjadi dengan foto struk dan voice note yang kukirim?',
    answer:
      'Saat kamu memakai fitur scan struk atau catatan suara, Cashly mengirim foto atau rekaman yang kamu pilih ke penyedia AI untuk dibaca dan diubah jadi draf pengeluaran. Kalau kamu mencatat lewat aplikasi, kamu bisa cek dan edit drafnya sebelum disimpan.',
  },
  {
    title: 'Kalau offline, apa aja yang masih bisa kubuka?',
    answer:
      'Kamu bisa baca catatan yang sudah dimuat di perangkat itu. Cashly menyimpan salinan catatan di browser dan membersihkannya saat kamu logout. Untuk masuk, menyimpan transaksi baru, scan struk, atau memproses voice note, kamu tetap perlu internet.',
  },
  {
    title: 'Perlu download Cashly dari App Store atau Play Store?',
    answer:
      'Nggak perlu. Cashly bisa langsung dibuka lewat browser. Kalau mau akses lebih cepat, pilih Tambahkan ke Layar Utama atau Instal aplikasi dari menu browser supaya Cashly bisa dibuka lewat ikonnya.',
  },
];

export function InstallSection() {
  return (
    <section
      className={`${styles.container} ${styles.section}`}
      id="pwa-install"
      aria-labelledby="judul-pwa"
    >
      <div className={`${styles.centerIntro} ${styles.installIntro}`}>
        <p className={styles.kicker}>Cashly di home screen</p>
        <h2 id="judul-pwa">
          Aplikasi Cashly, siap di HP-mu.
          <br />
          Nggak perlu download.
        </h2>
        <p>
          Cashly itu aplikasi web yang langsung bisa kamu pakai dari browser.
          Biar bukanya lebih sat-set,{' '}
          <strong>pasang Cashly di home screen</strong> dalam tiga langkah.
        </p>
      </div>

      <ol className={styles.threeColumns}>
        {installSteps.map(
          ({ title, description, icon: Icon, note, tone }, index) => (
            <li key={title} className={`${styles.glass} ${styles.guideCard}`}>
              <span
                className={`${styles.iconTile} ${styles.stepNumber} ${styles[tone]}`}
                aria-hidden
              >
                {index + 1}
              </span>
              <h3>{title}</h3>
              <p>{description}</p>
              <div className={styles.guideNote}>
                <Icon size={17} aria-hidden /> {note}
              </div>
            </li>
          ),
        )}
      </ol>
    </section>
  );
}

export function Questions() {
  return (
    <section
      className={`${styles.container} ${styles.section}`}
      aria-labelledby="judul-contoh"
    >
      <div className={styles.centerIntro}>
        <h2 id="judul-contoh">Cerita receh dari keseharianmu</h2>
        <p>Mulai dari yang paling gampang diinget. Satu aja dulu.</p>
      </div>
      <ul className={styles.threeColumns}>
        {examples.map(({ title, text, icon: Icon, tone }) => (
          <li key={title} className={`${styles.glass} ${styles.guideCard}`}>
            <span className={`${styles.iconTile} ${styles[tone]}`}>
              <Icon size={20} aria-hidden />
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ul>

      <div className={styles.faq} id="faq">
        <div className={styles.centerIntro}>
          <h2>Yang sering ditanyain</h2>
        </div>
        <Accordion.Root multiple className={styles.faqItems}>
          {questions.map(({ title, answer }) => (
            <Accordion.Item key={title} className={`${styles.glass} ${styles.question}`}>
              <Accordion.Header>
                <Accordion.Trigger className={styles.questionTrigger}>
                  {title}
                  <ChevronDown size={19} aria-hidden />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel className={styles.questionPanel}>
                <p>{answer}</p>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
