"use client";
import { Flame, Shield, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/pwa/connectivity";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";

export function StreakCard({
  streak,
  freezeBalance,
  calendar,
  todayCheckedIn = true,
  todayDate,
  pending = false,
  onCheckIn,
  onNoSpend,
  recovery,
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
  recovery?: {dates:string[];required:number;canRestore:boolean;result:number};
  onUseFreeze?: () => Promise<boolean>;
}) {
  const online=useOnline();
  const [confirming,setConfirming]=useState(false);
  const [restoreError,setRestoreError]=useState("");
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
            aria-label={`${day.date}: ${day.status === "upcoming" ? "belum tiba" : day.status === "missed" ? "belum check-in" : day.status === "protected" ? "hari terproteksi" : "check-in aktif"}`}
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
      <p className="caption streak-note"><Shield size={13} aria-hidden="true" />{freezeBalance}/5 proteksi bulan ini</p>
      {recovery && onUseFreeze && <div className="streak-recovery">
        <p>Perlu pemulihan: {recovery.required} hari terlewat.{!recovery.canRestore && " Jatah bulan ini tidak cukup."}</p>
        <Button variant="secondary" disabled={pending || !recovery.canRestore || !online} onClick={()=>{setRestoreError("");setConfirming(true);}}>Pulihkan &amp; check-in</Button>
      </div>}
      {confirming && recovery && onUseFreeze && <Dialog title="Pulihkan streak?" onClose={()=>{if(!pending)setConfirming(false);}} footer={<><Button variant="secondary" disabled={pending} onClick={()=>setConfirming(false)}>Batal</Button><Button disabled={pending||!online} onClick={async()=>{if(await onUseFreeze())setConfirming(false);else setRestoreError("Pemulihan belum berhasil. Periksa status terbaru dan coba lagi.");}}>{pending ? "Memulihkan..." : "Pulihkan & check-in"}</Button></>}>
        <p>Pakai {recovery.required} dari {freezeBalance} jatah tersisa untuk tanggal {recovery.dates.join(", ")}. Streak setelah check-in hari ini: <strong>{recovery.result} hari</strong>.</p>
        <p>Hari ini hanya dihitung sekali. Sisa proteksi tidak dibawa ke bulan berikutnya.</p>{restoreError&&<p role="alert">{restoreError}</p>}
      </Dialog>}
    </section>
  );
}
