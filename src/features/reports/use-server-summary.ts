"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { apiRequest } from "@/lib/finance";
import { addDays, periodBounds, type PeriodSelection } from "@/lib/format/period";
import { useExpenseSession } from "@/features/expenses/expense-session";
import { cachedSummary } from "./summary-cache";

const schema=z.object({amount_idr:z.string(),count:z.number()});
export function useServerSummary(period: PeriodSelection) {
  const {remoteMode,updatedAt,summaryCache}=useExpenseSession();
  const bounds=periodBounds(period);
  const key=`${bounds.start}/${bounds.end}/${updatedAt}`;
  const [state,setState]=useState<{key:string;data?:z.infer<typeof schema>;error?:string}>();
  useEffect(()=>{
    if(!remoteMode) return;
    let active=true;
    const params=new URLSearchParams({start:`${bounds.start}T00:00:00+07:00`,end:`${addDays(bounds.end,1)}T00:00:00+07:00`});
    void cachedSummary(summaryCache,key,async()=>schema.parse((await apiRequest(`reports/summary?${params}`)).data)).then(data=>{
      if(active) setState({key,data});
    }).catch(()=>{if(active) setState({key,error:"Ringkasan belum dapat dimuat dari server."});});
    return ()=>{active=false;};
  },[remoteMode,key,bounds.start,bounds.end,summaryCache]);
  return state?.key===key ? state : undefined;
}
