"use client";
import { homeFixture } from "@/mocks/fixtures/home";
import { useExpenseSession } from "@/features/expenses/expense-session";

export function useHomeData() {
  const session=useExpenseSession();
  if (!session.remoteMode) return homeFixture;
  const game=session.game;
  return {...homeFixture, asOf:new Date().toISOString(),
    level:game?.level ?? 1, xp:game?.total_xp ?? 0, streak:game?.current_streak ?? 0,
    mascotStage:game?.max_mascot_stage_unlocked ?? 0,
    maxMascotStageUnlocked:game?.max_mascot_stage_unlocked ?? 0,
    freezeBalance:game?.freeze_balance ?? 0,
    calendar:(game?.calendar ?? []).map(day=>({date:day.date,
      day:new Intl.DateTimeFormat("id",{weekday:"short"}).format(new Date(day.date+"T12:00:00+07:00")),
      status:day.status})),
  };
}
