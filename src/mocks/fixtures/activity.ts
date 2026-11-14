import { homeFixture, type Expense } from "./home";
import type { ReceiptDraft } from "@/features/scan/receipt-schema";

export type ExpenseSource = "receipt" | "voice" | "chat";
export type ActivityExpense = Expense & {
  source: ExpenseSource;
  tags: string[];
  draft?: ReceiptDraft;
};

// Fictional metadata layered on the same six Home records; never API history.
const metadata: { source: ExpenseSource; tags: string[] }[] = [
  { source: "receipt", tags: ["KopiSiang"] },
  { source: "chat", tags: ["TransportasiRutin"] },
  { source: "voice", tags: ["TagihanRumah"] },
  { source: "receipt", tags: ["MakanBersama"] },
  { source: "chat", tags: ["AkhirPekan"] },
  { source: "voice", tags: ["Langganan"] },
];
export const activityExpenses: ActivityExpense[] = homeFixture.expenses.map(
  (expense, index) => ({ ...expense, ...metadata[index] }),
);
export const expenseSourceLabels: Record<ExpenseSource, string> = {
  receipt: "Struk",
  voice: "Suara",
  chat: "Chat manual",
};
