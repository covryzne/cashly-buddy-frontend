"use client";

import type { Category, Expense } from "@/mocks/fixtures/home";
import { formatDate } from "@/lib/format/datetime";
import { CategoryIcon } from "./category-icon";
import { MoneyDisplay } from "./money-display";
import { ChevronRight, MessageCircle, Mic, ReceiptText } from "lucide-react";
import {
  expenseSourceLabels,
  type ExpenseSource,
} from "@/mocks/fixtures/activity";

export function TransactionRow({
  expense,
  category,
  onSelect,
  variant = "default",
  source,
  tags = [],
}: {
  expense: Expense;
  category: Category;
  onSelect: () => void;
  variant?: "default" | "timeline" | "category";
  source?: ExpenseSource;
  tags?: string[];
}) {
  const SourceIcon =
    source === "voice"
      ? Mic
      : source === "receipt"
        ? ReceiptText
        : MessageCircle;
  return (
    <button
      className={`transaction-row ${variant === "timeline" ? "transaction-row-timeline" : variant === "category" ? "transaction-row-category" : ""}`}
      data-modal-focus-key={`expense:${expense.id}`}
      onClick={onSelect}
    >
      <CategoryIcon category={category} />
      <span className="transaction-copy">
        {variant === "category" ? (
          <>
            <span className="category-transaction-title">
              <strong title={expense.merchant}>{expense.merchant}</strong>
              <span>{expense.paymentMethod || "Belum dipilih"}</span>
            </span>
            <small
              className="category-transaction-description"
              title={expense.description}
            >
              {expense.description || "Tanpa deskripsi"}
            </small>
            <time dateTime={expense.occurredAt}>
              {formatDate(expense.occurredAt, {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
              })}{" "}
              WIB
            </time>
          </>
        ) : (
          <strong title={expense.merchant}>{expense.merchant}</strong>
        )}
        {variant === "timeline" && source && (
          <span className={`transaction-source source-${source}`}>
            <SourceIcon size={11} aria-hidden="true" />
            {expenseSourceLabels[source]}
          </span>
        )}
        {variant !== "category" && (
          <small>
            {variant === "timeline"
              ? formatDate(expense.occurredAt, {
                  hour: "2-digit",
                  minute: "2-digit",
                  hourCycle: "h23",
                })
              : formatDate(expense.occurredAt, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
            · {expense.paymentMethod || "Pembayaran belum dipilih"}
          </small>
        )}
        {variant === "timeline" && tags.length > 0 && (
          <span className="transaction-tags">
            {tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </span>
        )}
      </span>
      {variant === "timeline" ? (
        <span className="transaction-value">
          <MoneyDisplay amountIdr={expense.amountIdr} expense />
          <ChevronRight size={15} aria-hidden="true" />
        </span>
      ) : (
        <>
          <MoneyDisplay amountIdr={expense.amountIdr} expense />
          {variant === "category" && (
            <ChevronRight size={16} aria-hidden="true" />
          )}
        </>
      )}
    </button>
  );
}
