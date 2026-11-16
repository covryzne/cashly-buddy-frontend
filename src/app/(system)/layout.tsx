import { redirect } from "next/navigation";
import { Suspense } from "react";
import { backend, verifiedSession } from "@/lib/auth/server";
import { accountSchema, apiExpensesSchema } from "@/lib/auth/types";
import { ExpenseSessionProvider } from "@/features/expenses/expense-session";
import { ProfileSessionProvider } from "@/features/profile/profile-session";
import { AuthSessionBoundary } from "@/features/auth/session-boundary";
import type { ActivityExpense } from "@/mocks/fixtures/activity";

async function loadData() {
  const session = await verifiedSession();
  if (!session) return null;
  const [me, expenses] = await Promise.all([
    backend("/me", session.token), backend("/expenses", session.token),
  ]);
  if (!me.ok || !expenses.ok) return null;
  const account = accountSchema.parse((await me.json()).data);
  const result = apiExpensesSchema.parse(await expenses.json());
  return { account, result };
}

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<main className="local-data-empty"><p role="status">Menyiapkan akun Cashly…</p></main>}><SystemContent>{children}</SystemContent></Suspense>;
}

async function SystemContent({ children }: { children: React.ReactNode }) {
  const data = await loadData().catch(() => null);
  if (!data) redirect("/auth/complete");
  const payments: Record<string, string> = {
    qris: "QRIS", cash: "Tunai", bank_transfer: "Transfer bank", debit_card: "Kartu debit",
    credit_card: "Kartu kredit", e_wallet: "Dompet digital", unknown: "Lainnya",
  };
  const expenses: ActivityExpense[] = data.result.data.map(row => ({
    id: row.id, merchant: row.merchant, description: row.description,
    categoryCode: row.category_code, amountIdr: row.amount_idr, occurredAt: row.occurred_at,
    paymentMethod: payments[row.payment_method] ?? row.payment_method,
    source: row.source === "receipt" ? "receipt" : row.source === "voice" ? "voice" : "chat", tags: [],
  }));
  return <AuthSessionBoundary key={data.account.account_id}>
    <ExpenseSessionProvider remote={{ expenses, sampleData: data.account.sample_data, hasMore: data.result.has_more }}>
      <ProfileSessionProvider account={data.account}>{children}</ProfileSessionProvider>
    </ExpenseSessionProvider>
  </AuthSessionBoundary>;
}
