"use client";

import {
  createContext,
  Fragment,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  activityExpenses,
  type ActivityExpense,
} from "@/mocks/fixtures/activity";
import {
  receiptAmounts,
  type ReceiptDraft,
} from "@/features/scan/receipt-schema";
import { wibDateTime } from "@/lib/format/datetime";
import type { ChatBatchSnapshot } from "./chat-batch";

type ExpenseSession = {
  expenses: ActivityExpense[];
  chatSession: ChatBatchSnapshot | null;
  setChatSession: (snapshot: ChatBatchSnapshot) => void;
  updateExpense: (id: string, draft: ReceiptDraft) => void;
  removeExpense: (id: string) => void;
  restoreExpense: (expense: ActivityExpense) => void;
  resetSession: () => void;
};
const Context = createContext<ExpenseSession | null>(null);

/** In-memory prototype records only. No persistence, API or reward authority. */
export function ExpenseSessionProvider({ children }: { children: ReactNode }) {
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const [expenses, setExpenses] = useState(activityExpenses);
  const [chatSession, setChatSession] = useState<ChatBatchSnapshot | null>(
    null,
  );
  const value = useMemo<ExpenseSession>(
    () => ({
      expenses,
      chatSession,
      setChatSession,
      resetSession: () => {
        setExpenses(activityExpenses);
        setChatSession(null);
        setSessionEpoch((current) => current + 1);
      },
      updateExpense: (id, draft) =>
        setExpenses((previous) =>
          previous.map((expense) =>
            expense.id === id
              ? {
                  ...expense,
                  draft,
                  merchant: draft.merchant || draft.items[0].name,
                  description: draft.items.map((item) => item.name).join(", "),
                  categoryCode: draft.categoryCode,
                  paymentMethod: draft.paymentMethod,
                  occurredAt: wibDateTime(
                    draft.occurredDate,
                    draft.occurredTime,
                  ),
                  amountIdr: receiptAmounts(draft).total.toString(),
                }
              : expense,
          ),
        ),
      removeExpense: (id) =>
        setExpenses((previous) =>
          previous.filter((expense) => expense.id !== id),
        ),
      restoreExpense: (expense) =>
        setExpenses((previous) =>
          previous.some((entry) => entry.id === expense.id)
            ? previous
            : [...previous, expense],
        ),
    }),
    [expenses, chatSession],
  );
  return (
    <Context.Provider value={value}>
      <Fragment key={sessionEpoch}>{children}</Fragment>
    </Context.Provider>
  );
}
export function useExpenseSession() {
  const context = useContext(Context);
  if (!context) throw new Error("ExpenseSessionProvider is required");
  return context;
}
