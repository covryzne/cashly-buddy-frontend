import Image from "next/image";
import { Coffee, Flame, Shield, Sparkles, TrainFront, Utensils } from "lucide-react";
import { evolutionStages } from "@/features/profile/profile-model";
import { formatMoney } from "@/lib/format/money";
import styles from "./landing.module.css";

const transactions = [
  { name: "Kopi Sudut Literasi", category: "Jajan & minum", amount: 28000, icon: Coffee, tone: "butter" },
  { name: "Kartu MRT Dukuh Atas", category: "Transportasi", amount: 14000, icon: TrainFront, tone: "mint" },
  { name: "Nasi Ayam Geprek", category: "Makan siang", amount: 25000, icon: Utensils, tone: "peach" },
] as const;

const week = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const demoStreak = 12;
const [firstStage, nextStage] = evolutionStages;

export function ProductPreview() {
  return (
    <div className={styles.preview} aria-label="Contoh tampilan Cashly" role="group">
      <article className={`${styles.glass} ${styles.ticket}`}>
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.kicker}>Rekap bulanan</p>
            <h2>November 2026</h2>
          </div>
          <span className={styles.chip}>Potret Dompet</span>
        </div>
        <div className={styles.total}>
          <div>
            <p>Total pengeluaran</p>
            <strong>{formatMoney("2450000")}</strong>
          </div>
          <span className={`${styles.chip} ${styles.mint}`}>42 catatan</span>
        </div>
        <h3 className={styles.listTitle}>Terakhir dicatat</h3>
        <ul className={styles.transactions}>
          {transactions.map(({ name, category, amount, icon: Icon, tone }) => (
            <li key={name}>
              <span className={`${styles.iconTile} ${styles[tone]}`}><Icon size={17} aria-hidden /></span>
              <div>
                <p>{name}</p>
                <small>{category}</small>
              </div>
              <strong>−{formatMoney(String(amount))}</strong>
            </li>
          ))}
        </ul>
      </article>

      <div className={styles.previewSide}>
        <article className={`${styles.glass} ${styles.companion}`}>
          <div className={styles.cardHeader}>
            <h2 className={`${styles.chip} ${styles.lavender}`}><Sparkles size={14} aria-hidden /> Mochi</h2>
            <p className={styles.previewCaption}>Bestie dompetmu</p>
          </div>
          <div className={styles.companionBody}>
            <div className={styles.mochiArt}>
              <Image alt={firstStage.name} src="/mascot/mochi-level-1-transparent.png" width={128} height={128} />
            </div>
            <div>
              <p className={styles.speech}>“Kopi sore tadi enak banget ya? Satu catatan kecil hari ini, udah keren banget.”</p>
              <p className={styles.mochiLevel}><Sparkles size={14} aria-hidden /> Level {firstStage.stage} · Naik level saat streak {nextStage.days} hari</p>
            </div>
          </div>
        </article>

        <article className={`${styles.glass} ${styles.streak}`}>
          <div className={styles.cardHeader}>
            <h2><span className={`${styles.iconTile} ${styles.peach}`}><Flame size={18} aria-hidden /></span> {demoStreak} Hari Streak</h2>
            <span className={styles.chip}><Shield size={13} aria-hidden /> 1 Freeze</span>
          </div>
          <p>Langkah kecil tiap hari. Bolos sehari? Freeze yang jagain streak kamu.</p>
          <ol className={styles.week} aria-label="Contoh progres minggu ini">
            {week.map((day, index) => (
              <li key={day}>
                <span aria-hidden>{day.slice(0, 3)}</span>
                <span className={index < 5 ? styles.dayDone : styles.dayPending} aria-hidden>
                  <Flame size={14} />
                </span>
                <span className="sr-only">{day}, {index < 5 ? "udah dicatat" : "belum dicatat"}</span>
              </li>
            ))}
          </ol>
        </article>
      </div>
    </div>
  );
}
