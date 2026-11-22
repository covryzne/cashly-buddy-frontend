import type { Expense } from "@/mocks/fixtures/home";
import { selectPeriod } from "@/features/home/select-month";
import {
  dayCount,
  percentage,
  previousPeriod,
  reportPeriodLabel,
} from "@/features/reports/select-reports";
import { periodBounds, type PeriodSelection } from "@/lib/format/period";

export type CategoryDetailFilters = {
  payment: string | null;
  order: "newest" | "oldest";
};
export const defaultCategoryDetailFilters: CategoryDetailFilters = {
  payment: null,
  order: "newest",
};
const sum = (expenses: readonly Expense[]) =>
  expenses.reduce(
    (total, expense) => total + BigInt(expense.amountIdr),
    BigInt(0),
  );
export function selectCategoryDetail(
  expenses: readonly Expense[],
  period: PeriodSelection,
  code: string,
  filters = defaultCategoryDetailFilters,
) {
  const selected = selectPeriod(period, expenses);
  const records = selected.expenses.filter(
    (expense) => expense.categoryCode === code,
  );
  const total = sum(records);
  const previous = previousPeriod(period);
  const previousRecords = selectPeriod(previous, expenses).expenses.filter(
    (expense) => expense.categoryCode === code,
  );
  const before = sum(previousRecords);
  const difference = total - before;
  const bounds = periodBounds(period);
  const days = dayCount(bounds.start, bounds.end);
  const methods = Array.from(
    new Set(records.map((expense) => expense.paymentMethod)),
  )
    .map((payment) => ({
      payment,
      label: payment || "Belum dipilih",
      count: records.filter((expense) => expense.paymentMethod === payment)
        .length,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "id"));
  const topMethod = methods.find((method) => method.payment !== "");
  const payment =
    filters.payment !== null &&
    methods.some((method) => method.payment === filters.payment)
      ? filters.payment
      : null;
  const rows = records
    .filter((expense) => payment === null || expense.paymentMethod === payment)
    .sort(
      (a, b) =>
        (Date.parse(b.occurredAt) - Date.parse(a.occurredAt) ||
          a.id.localeCompare(b.id)) * (filters.order === "oldest" ? -1 : 1),
    );
  return {
    count: records.length,
    totalIdr: total.toString(),
    periodLabel: reportPeriodLabel(period),
    share: percentage(total.toString(), selected.totalIdr),
    days,
    averageIdr: (
      (total + BigInt(Math.floor(days / 2))) /
      BigInt(days)
    ).toString(),
    methods,
    topMethod: topMethod
      ? {
          ...topMethod,
          percent: percentage(String(topMethod.count), String(records.length)),
        }
      : null,
    comparison: {
      percent:
        before > BigInt(0)
          ? percentage(
              (difference < BigInt(0) ? -difference : difference).toString(),
              before.toString(),
            )
          : null,
      direction:
        difference < BigInt(0)
          ? "down"
          : difference > BigInt(0)
            ? "up"
            : "same",
      periodLabel: reportPeriodLabel(previous),
    },
    payment,
    rows,
  };
}
