import {
  CheckCircle2,
  Crown,
  Flame,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { evolutionStages } from "./profile-model";
import { homeFixture } from "@/mocks/fixtures/home";
export function EvolutionGuide({
  tab,
  onTab,
  selectedStage,
}: {
  tab: "evolution" | "freeze";
  onTab: (tab: "evolution" | "freeze") => void;
  selectedStage?: number;
}) {
  const stages = selectedStage
    ? evolutionStages.filter((stage) => stage.stage === selectedStage)
    : evolutionStages;
  return (
    <div className="evolution-guide">
      <p>
        Level XP, streak, dan tahap evolusi Mochi punya peran yang berbeda. Yuk,
        kenali perjalanan kecilmu.
      </p>
      <div
        className="profile-guide-tabs"
        role="group"
        aria-label="Panduan Mochi"
      >
        <button
          type="button"
          aria-pressed={tab === "evolution"}
          onClick={() => onTab("evolution")}
        >
          <Sparkles size={16} />
          Tahapan evolusi
        </button>
        <button
          type="button"
          aria-pressed={tab === "freeze"}
          onClick={() => onTab("freeze")}
        >
          <ShieldCheck size={16} />
          Streak & Freeze
        </button>
      </div>
      {tab === "evolution" ? (
        <>
          <div className="profile-guide-note">
            <Crown size={22} />
            <div>
              <h3>Evolusi yang terbuka tetap milikmu.</h3>
              <p>
                Streak yang terhenti tidak menurunkan tahap tertinggi yang sudah
                kamu buka. Evolusi mengikuti streak, bukan jumlah XP.
              </p>
            </div>
          </div>
          <ol className="evolution-guide-list">
            {stages.map((stage) => (
              <li
                key={stage.stage}
                className={
                  selectedStage === stage.stage ? "is-highlighted" : ""
                }
              >
                <span className="profile-stage-number">{stage.stage}</span>
                <div>
                  <h3>{stage.name}</h3>
                  <p>
                    Hero level {stage.stage} · Terbuka pada {stage.days} hari
                    streak
                  </p>
                  <small>{stage.description}</small>
                </div>
                <span>
                  {stage.stage === homeFixture.mascotStage
                    ? "Dipakai"
                    : stage.stage <= homeFixture.maxMascotStageUnlocked
                      ? "Terbuka"
                      : "Terkunci"}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <>
          <div className="profile-guide-note">
            <Flame size={22} />
            <div>
              <h3>Satu hari, satu langkah berarti.</h3>
              <p>
                Mencatat beberapa pengeluaran dalam satu hari tetap dihitung
                satu check-in. Membuka aplikasi atau menyapa Mochi tidak
                menambah streak maupun XP.
              </p>
            </div>
          </div>
          <ul className="profile-rule-list">
            <li>
              <CheckCircle2 size={19} />
              <span>
                Check-in berasal dari aktivitas yang memenuhi syarat:
                pencatatan, konfirmasi tanpa pengeluaran, atau review harian
                yang dilakukan secara eksplisit.
              </span>
            </li>
            <li>
              <ShieldCheck size={19} />
              <span>
                Freeze digunakan secara manual untuk hari terlewat yang memenuhi
                syarat. Selalu ada konfirmasi; Freeze tidak terpakai otomatis.
              </span>
            </li>
            <li>
              <Sparkles size={19} />
              <span>
                Freeze menjaga kesinambungan streak tanpa menambah XP. Mengubah
                tanggal transaksi tidak mengisi check-in masa lalu.
              </span>
            </li>
          </ul>
          <p className="profile-field-hint">
            Stok dan kelayakan Freeze mengikuti status akun. Penggunaan Freeze
            belum tersedia di sini.
          </p>
        </>
      )}
    </div>
  );
}
