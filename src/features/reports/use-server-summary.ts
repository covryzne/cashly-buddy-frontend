"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { apiRequest } from "@/lib/finance";
import { addDays, periodBounds, type PeriodSelection } from "@/lib/format/period";
import { useExpenseSession } from "@/features/expenses/expense-session";

const schema=z.object({amount_idr:z.string(),count:z.number()});
export function useServerSummary(period: PeriodSelection) {
  const {remoteMode,updatedAt}=useExpenseSession();
  const bounds=periodBounds(period);
  const key=`${bounds.start}/${bounds.end}/${updatedAt}`;
  const [state,setState]=useState<{key:string;data?:z.infer<typeof schema>;error?:string}>();
  useEffect(()=>{
    if(!remoteMode) return;
    let active=true;
    const params=new URLSearchParams({start:`${bounds.start}T00:00:00+07:00`,end:`${addDays(bounds.end,1)}T00:00:00+07:00`});
    void apiRequest(`reports/summary?${params}`).then(result=>{
      const data=schema.parse(result.data); if(active) setState({key,data});
    }).catch(()=>{if(active) setState({key,error:"Ringkasan belum dapat dimuat dari server."});});
    return ()=>{active=false;};
  },[remoteMode,key,bounds.start,bounds.end]);
  return state?.key===key ? state : undefined;
}
