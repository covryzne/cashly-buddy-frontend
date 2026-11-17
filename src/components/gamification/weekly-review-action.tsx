"use client";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExpenseSession } from "@/features/expenses/expense-session";
import { useOnline } from "@/lib/pwa/connectivity";

export function WeeklyReviewAction({hasExpenses}:{hasExpenses:boolean}) {
  const {game,gameAction,mutationPending}=useExpenseSession();
  const online=useOnline();
  const weekly=game?.missions.find(m=>m.code==="weekly");
  if(!weekly) return <p role="status">Status review belum tersedia.</p>;
  if(weekly.completed) return <p className="weekly-reviewed-status" role="status">
    <CheckCircle2 size={17} aria-hidden="true" />Sudah direview minggu ini
  </p>;
  return <div className="weekly-review-controls">
    {!weekly.can_complete && <p className="caption">Review tersedia Sabtu dan Minggu.</p>}
    {weekly.test_override && <p className="caption">Mode uji development aktif.</p>}
    <Button size="sm" disabled={!online || mutationPending || !hasExpenses || !weekly.can_complete} onClick={()=>void gameAction("weekly")}>
    {mutationPending ? "Menyimpan…" : `Selesai review · +${weekly.xp} XP`}
  </Button></div>;
}
