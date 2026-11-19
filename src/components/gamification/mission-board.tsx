import { Check, CheckCheck, Flame, ShieldCheck } from "lucide-react";

export function MissionBoard() {
  return (
    <div className="mission-board">
      <div className="mission-board-summary">
        <span className="mission-summary-icon">
          <CheckCheck size={25} />
        </span>
        <div>
          <strong>Satu langkah baik hari ini.</strong>
          <p>1 dari 1 misi selesai</p>
        </div>
        <span className="mission-summary-count">1/1</span>
      </div>
      <progress
        className="mission-board-progress"
        value={1}
        max={1}
        aria-label="Progres misi"
      />
      <ul className="mission-detail-list">
        <li className="mission-detail mission-detail-done">
          <div className="mission-detail-heading">
            <span className="mission-detail-icon tone-mint">
              <Check size={21} />
            </span>
            <div>
              <small>Harian</small>
              <h3>Catat pengeluaran hari ini</h3>
            </div>
            <span className="mission-status-done">
              <Check size={13} />
              Selesai
            </span>
          </div>
          <p>
            Pengeluaranmu sudah tercatat. Check-in hari ini juga sudah selesai.
          </p>
          <div className="mission-detail-foot">
            <Flame size={14} />
            <span>Check-in harian</span>
            <strong>1/1</strong>
          </div>
        </li>
      </ul>
      <div className="mission-board-note">
        <ShieldCheck size={18} />
        <p>
          Check-in dihitung sekali sehari. Membuka misi atau menyapa Mochi tidak
          menambah streak.
        </p>
      </div>
    </div>
  );
}
