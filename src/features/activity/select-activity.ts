import { homeFixture, type Expense } from "@/mocks/fixtures/home";
import {
  type ActivityExpense,
  expenseSourceLabels,
} from "@/mocks/fixtures/activity";
import {
  dateKey,
  rangeLabel,
  addDays,
  weekStart,
  type PeriodSelection,
} from "@/lib/format/period";
export { periodBounds, addDays, weekStart } from "@/lib/format/period";
import { formatDate } from "@/lib/format/datetime";
import { monthKey } from "@/features/home/select-month";
import type { ReceiptDraft } from "@/features/scan/receipt-schema";

export type ActivityView = "all" | "day" | "week";
export type ActivityFilters = {
  category: string;
  source: string;
  payment: string;
  order: "newest" | "oldest";
};
export const defaultActivityFilters: ActivityFilters = {
  category: "all",
  source: "all",
  payment: "all",
  order: "newest",
};
const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
export const sumExpenses = (expenses: readonly Expense[]) =>
  expenses
    .reduce((total, expense) => total + BigInt(expense.amountIdr), BigInt(0))
    .toString();
export function inPeriod(expense: Expense, period: PeriodSelection) {
  const day = dateKey(expense.occurredAt);
  return period.kind === "month"
    ? day.startsWith(period.month)
    : day >= period.start && day <= period.end;
}
export function activityGroupLabel(
  key: string,
  view: ActivityView,
  today: string,
) {
  if (view === "week") return rangeLabel(key, addDays(key, 6));
  const label = formatDate(`${key}T12:00:00+07:00`, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${key === today ? "Hari ini · " : key === addDays(today, -1) ? "Kemarin · " : ""}${label}`;
}
export function selectActivity(
  expenses: readonly ActivityExpense[],
  period: PeriodSelection,
  filters: ActivityFilters,
  query: string,
  view: ActivityView,
  day: string,
) {
  const periodExpenses = expenses.filter((expense) =>
    inPeriod(expense, period),
  );
  const term = normalize(query.trim().replace(/^#/, ""));
  const base = periodExpenses.filter((expense) => {
    const category = homeFixture.categories.find(
      (entry) => entry.code === expense.categoryCode,
    );
    return (
      (view !== "day" || dateKey(expense.occurredAt) === day) &&
      (filters.source === "all" || expense.source === filters.source) &&
      (filters.payment === "all" ||
        expense.paymentMethod === filters.payment) &&
      (!term ||
        normalize(
          [
            expense.merchant,
            expense.description,
            category?.label,
            expense.tags.join(" "),
            expenseSourceLabels[expense.source],
          ].join(" "),
        ).includes(term))
    );
  });
  const selected = base
    .filter(
      (expense) =>
        filters.category === "all" || expense.categoryCode === filters.category,
    )
    .sort(
      (a, b) =>
        (Date.parse(b.occurredAt) - Date.parse(a.occurredAt) ||
          a.id.localeCompare(b.id)) * (filters.order === "oldest" ? -1 : 1),
    );
  const groups = new Map<string, ActivityExpense[]>();
  for (const expense of selected) {
    const key =
      view === "week"
        ? weekStart(dateKey(expense.occurredAt))
        : dateKey(expense.occurredAt);
    groups.set(key, [...(groups.get(key) ?? []), expense]);
  }
  const categories = homeFixture.categories.map((category) => ({
    ...category,
    count: base.filter((expense) => expense.categoryCode === category.code)
      .length,
    amountIdr: sumExpenses(
      selected.filter((expense) => expense.categoryCode === category.code),
    ),
  }));
  const dominant = [...categories].sort((a, b) =>
    BigInt(a.amountIdr) === BigInt(b.amountIdr)
      ? a.code.localeCompare(b.code)
      : BigInt(a.amountIdr) > BigInt(b.amountIdr)
        ? -1
        : 1,
  )[0];
  const totalIdr = sumExpenses(selected);
  return {
    expenses: selected,
    periodCount: periodExpenses.length,
    categories,
    baseCount: base.length,
    totalIdr,
    count: selected.length,
    days: new Set(selected.map((expense) => dateKey(expense.occurredAt))).size,
    dominant:
      BigInt(totalIdr) > BigInt(0)
        ? {
            ...dominant,
            percent: Number(
              (BigInt(dominant.amountIdr) * BigInt(100)) / BigInt(totalIdr),
            ),
          }
        : null,
    groups: Array.from(groups, ([key, rows]) => ({
      key,
      expenses: rows,
      totalIdr: sumExpenses(rows),
    })),
  };
}
export function expenseDraft(expense: ActivityExpense): ReceiptDraft {
  return (
    expense.draft ?? {
      merchant: expense.merchant,
      categoryCode: expense.categoryCode,
      paymentMethod: expense.paymentMethod,
      occurredDate: dateKey(expense.occurredAt),
      occurredTime: formatDate(expense.occurredAt, {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).replace(".", ":"),
      items: [
        {
          id: expense.id,
          name: expense.description || expense.merchant,
          quantity: "1",
          priceIdr: expense.amountIdr,
        },
      ],
      discountIdr: "0",
      taxIdr: "0",
    }
  );
}
export function activityPeriodLabel(period: PeriodSelection) {
  return period.kind === "month"
    ? formatDate(`${period.month}-01T12:00:00+07:00`, {
        month: "long",
        year: "numeric",
      })
    : rangeLabel(period.start, period.end);
}
export function currentActivityMonth(day: string) {
  return monthKey(`${day}T12:00:00+07:00`);
}
