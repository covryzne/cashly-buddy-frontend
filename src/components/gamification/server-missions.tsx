"use client";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { useExpenseSession } from "@/features/expenses/expense-session";

export function ServerMissions({onOpen}:{onOpen:()=>void}) {
  const {game}=useExpenseSession();
  const weekly=game?.missions.find(m=>m.code==="weekly");
  if(!weekly) return <p role="status">Status misi belum tersedia.</p>;
  return <button className="weekly-mission-link" onClick={onOpen}>
    <strong>Review mingguan</strong>
    <span>{weekly.completed ? <><CheckCircle2 size={14} aria-hidden="true" />Selesai</> : weekly.can_complete ? "Belum selesai" : "Sabtu?Minggu"}</span>
    <ChevronRight size={16} aria-hidden="true" />
  </button>;
}
