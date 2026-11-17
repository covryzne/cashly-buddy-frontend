"use client";
import { Flame, Shield, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/pwa/connectivity";

export function StreakCard({
  streak,
  freezeBalance,
  calendar,
  todayCheckedIn = true,
  todayDate,
  pending = false,
  onCheckIn,
  onNoSpend,
  recoveryDate,
  onUseFreeze,
}: {
  streak: number;
  freezeBalance: number;
  calendar: { date: string; day: string; status: string }[];
  todayCheckedIn?: boolean;
  todayDate?: string;
  pending?: boolean;
  onCheckIn?: () => void;
  onNoSpend?: () => void;
  recoveryDate?: string;
  onUseFreeze?: () => void;
}) {
  const online=useOnline();
  return (
    <section className="card streak-card" aria-labelledby="streak-title">
      <div className="section-heading">
        <h2 id="streak-title">
          {streak} hari streak{" "}
          <Flame size={21} className="streak-flame" aria-hidden="true" />
        </h2>
        <span className="pill checkin-status" data-checked-in={todayCheckedIn} role="status">
          {todayCheckedIn && <Check size={13} aria-hidden="true" />}
          {todayCheckedIn ? "Sudah check-in" : "Belum check-in"}
        </span>
      </div>
      <ol className="streak-calendar">
        {calendar.map((day) => (
          <li
            key={day.date}
            aria-current={day.date===todayDate ? "date" : undefined}
            aria-label={`${day.date}: ${day.status === "upcoming" ? "belum tiba" : day.status === "missed" ? "belum check-in" : day.status === "protected" ? "dilindungi Freeze" : "check-in aktif"}`}
          >
            <span>{day.day}</span>
            {day.date===todayDate && onCheckIn ? <button
              type="button"
              className={`day-marker day-marker-button is-current ${todayCheckedIn ? "is-active" : "is-dim"}`}
              disabled={pending || todayCheckedIn || !online}
              aria-label={`${todayCheckedIn ? "Sudah check-in" : "Check-in hari ini"}, ${day.day} ${day.date}`}
              aria-busy={pending}
              onClick={onCheckIn}
            >
              {pending ? <LoaderCircle size={19} className="checkin-spinner" aria-hidden="true" /> : <Flame size={19} aria-hidden="true" />}
            </button> : <span
                className={`day-marker ${day.status === "today" || day.status === "active" ? "is-active" : day.status === "protected" ? "is-protected" : "is-dim"} ${day.date===todayDate ? "is-current" : ""}`}
              >
                {day.status === "protected" ? <Shield size={17} aria-hidden="true" /> : <Flame size={19} aria-hidden="true" />}
              </span>}
          </li>
        ))}
      </ol>
      {!todayCheckedIn && onNoSpend && <div className="streak-checkin-actions">
        <Button variant="ghost" disabled={pending || !online} onClick={onNoSpend}>Hari ini tanpa pengeluaran</Button>
      </div>}
      <p className="caption streak-note">
        <Check size={14} />
        {todayCheckedIn ? "Kamu sudah check-in. Sampai jumpa besok!" : "Ketuk api hari ini untuk check-in."}
      </p>
      <p className="caption streak-note"><Shield size={13} aria-hidden="true" />{freezeBalance} Freeze tersedia</p>
      {recoveryDate && onUseFreeze && <div className="streak-recovery">
        <p>Pulihkan tanggal {recoveryDate} dengan 1 Freeze.</p>
        <Button variant="secondary" disabled={pending || !freezeBalance} onClick={onUseFreeze}>Pakai 1 Freeze</Button>
      </div>}
    </section>
  );
}
