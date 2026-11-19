"use client";
import { AppLoader } from "@/components/shared/app-loader";
import { useId, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReceiptReview } from "@/components/finance/receipt-review";
import { blankReceipt, receiptSchema } from "@/features/scan/receipt-schema";
import { useExpenseSession } from "./expense-session";
import { useOnline } from "@/lib/pwa/connectivity";

export function ManualExpenseForm({onClose}:{onClose:()=>void}) {
  const online = useOnline();
  const [draft,setDraft]=useState(blankReceipt);
  const [errors,setErrors]=useState<Record<string,string>>({});
  const session=useExpenseSession();
  const formId=useId();
  async function submit() {
    if (!online) return;
    const result=receiptSchema.safeParse(draft);
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map(i=>[i.path.join("."),i.message]))); return;
    }
    if(await session.createExpense(result.data)) onClose();
  }
  return <Dialog title="Catat pengeluaran manual" onClose={onClose} variant="screen"
    className="scan-flow" footer={<Button form={formId} type="submit" disabled={!online || session.mutationPending}>
      {session.mutationPending ? <AppLoader inline /> : "Simpan pengeluaran"}</Button>}>
    <ReceiptReview draft={draft} errors={errors} formId={formId} onChange={setDraft}
      onSubmit={submit} onRetake={onClose} showSourcePreview={false} manual />
  </Dialog>;
}
