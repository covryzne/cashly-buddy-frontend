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
    title: 'Cashly butuh akses rekening bank nggak?',
    answer:
      'Nggak perlu sambungin rekening bank buat pakai Cashly. Kamu sendiri yang pilih pengeluaran mana yang mau dicatat.',
  },
  {
    title: 'Kalau offline, apa aja yang masih bisa dibuka?',
    answer:
      'Data yang udah ke-load di perangkat itu masih bisa kamu baca. Buat login, simpan catatan baru, scan struk, atau olah voice note, kamu tetap perlu koneksi internet.',
  },
  {
    title: 'Perlu download Cashly dari App Store atau Play Store?',
    answer:
      'Nggak perlu. Cashly itu aplikasi web yang bisa langsung kamu pakai dari browser. Biar bukanya lebih sat-set, pasang Cashly di home screen lewat menu browser.',
  },
  {
    title: 'Kalau ganti HP, dataku gimana?',
    answer:
      'Di HP baru, buka Cashly pas online dan login pakai akun yang sama. Catatan yang udah tersimpan bisa kamu buka lagi.',
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
