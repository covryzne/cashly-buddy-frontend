"use client";
import { homeFixture } from "@/mocks/fixtures/home";
import { useExpenseSession } from "@/features/expenses/expense-session";

export function useHomeData() {
  const session=useExpenseSession();
  if (!session.remoteMode) { const level=1+[30,100,150,200].filter(day=>homeFixture.streak>=day).length; return {...homeFixture,level,xp:0,mascotStage:level,maxMascotStageUnlocked:level}; }
  const game=session.game;
  return {...homeFixture, asOf:new Date().toISOString(),
    level:game?.hero_level ?? 1, xp:0, streak:game?.current_streak ?? 0,
    mascotStage:game?.hero_level ?? 1,
    maxMascotStageUnlocked:game?.hero_level ?? 1,
    freezeBalance:game?.protection_remaining ?? 0,
    calendar:(game?.calendar ?? []).map(day=>({date:day.date,
      day:new Intl.DateTimeFormat("id",{weekday:"short"}).format(new Date(day.date+"T12:00:00+07:00")),
      status:day.status})),
  };
}
