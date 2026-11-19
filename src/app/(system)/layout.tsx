import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppLoader } from "@/components/shared/app-loader";
import { backend, verifiedSession } from "@/lib/auth/server";
import { accountSchema, apiExpensesSchema } from "@/lib/auth/types";
import { ExpenseSessionProvider } from "@/features/expenses/expense-session";
import { ProfileSessionProvider } from "@/features/profile/profile-session";
import { AuthSessionBoundary } from "@/features/auth/session-boundary";
import { mapExpense } from "@/lib/finance";

async function loadData() {
  const session = await verifiedSession();
  if (!session) return null;
  const [me, expenses] = await Promise.all([
    backend("/me", session.token), backend("/expenses", session.token),
  ]);
  if (!me.ok || !expenses.ok) return null;
  const account = accountSchema.parse((await me.json()).data);
  const result = apiExpensesSchema.parse(await expenses.json());
  while (result.has_more && result.next_cursor) {
    const response = await backend(`/expenses?cursor=${encodeURIComponent(result.next_cursor)}`, session.token);
    if (!response.ok) throw new Error("Expense page unavailable");
    const page = apiExpensesSchema.parse(await response.json());
    result.data.push(...page.data);
    result.has_more = page.has_more;
    result.next_cursor = page.next_cursor;
  }
  return { account, result };
}

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<main className="app-loading-screen"><AppLoader /></main>}><SystemContent>{children}</SystemContent></Suspense>;
}

async function SystemContent({ children }: { children: React.ReactNode }) {
  const data = await loadData().catch(() => null);
  if (!data) redirect("/auth/complete");
  const expenses = data.result.data.map(mapExpense);
  return <AuthSessionBoundary key={data.account.account_id} accountId={data.account.account_id}>
    <ExpenseSessionProvider remote={{ expenses, sampleData: data.account.sample_data, hasMore: data.result.has_more, runtime: data.account.runtime }}>
      <ProfileSessionProvider account={data.account}>{children}</ProfileSessionProvider>
    </ExpenseSessionProvider>
  </AuthSessionBoundary>;
}
