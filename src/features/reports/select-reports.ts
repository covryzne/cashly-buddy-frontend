import type { Expense, Category } from "@/mocks/fixtures/home";
import { selectPeriod } from "@/features/home/select-month";
import {
  addDays,
  periodBounds,
  weekStart,
  rangeLabel,
  type PeriodSelection,
} from "@/lib/format/period";
import { formatDate } from "@/lib/format/datetime";
import { formatMoney } from "@/lib/format/money";

export type ReportCategory = Category & { count: number; percent: number };
export type TrendPoint = {
  start: string;
  end: string;
  label: string;
  totalIdr: string;
  count: number;
};
export const dayCount = (start: string, end: string) =>
  Math.round(
    (Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) /
      86400000,
  ) + 1;
export const percentage = (part: string, total: string) =>
  BigInt(total) > BigInt(0)
    ? Number(
        (BigInt(part) * BigInt(1000) + BigInt(total) / BigInt(2)) /
          BigInt(total),
      ) / 10
    : 0;
export function previousPeriod(period: PeriodSelection): PeriodSelection {
  const { start, end } = periodBounds(period);
  if (period.kind === "month") {
    return { kind: "month", month: addDays(start, -1).slice(0, 7) };
  }
  return {
    kind: "range",
    start: addDays(start, -dayCount(start, end)),
    end: addDays(start, -1),
  };
}
export function reportPeriodLabel(period: PeriodSelection) {
  return period.kind === "month"
    ? formatDate(`${period.month}-01T12:00:00+07:00`, {
        month: "long",
        year: "numeric",
      })
    : rangeLabel(period.start, period.end);
}
const shortDate = (day: string) =>
  formatDate(`${day}T12:00:00+07:00`, { day: "numeric", month: "short" });

function trendIntervals(start: string, end: string) {
  const days = dayCount(start, end);
  const unit: "day" | "week" | "month" | "year" =
    days <= 7 ? "day" : days <= 62 ? "week" : days <= 366 ? "month" : "year";
  const points: Array<Omit<TrendPoint, "totalIdr" | "count">> = [];
  let cursor = start;
  const yearStep = Math.max(
    1,
    Math.ceil((Number(end.slice(0, 4)) - Number(start.slice(0, 4)) + 1) / 12),
  );
  while (cursor <= end) {
    let next: string;
    if (unit === "day") next = addDays(cursor, 1);
    else if (unit === "week") next = addDays(weekStart(cursor), 7);
    else if (unit === "month")
      next = addDays(
        periodBounds({ kind: "month", month: cursor.slice(0, 7) }).end,
        1,
      );
    else next = `${Number(cursor.slice(0, 4)) + yearStep}-01-01`;
    const last = addDays(next, -1) < end ? addDays(next, -1) : end;
    const label =
      unit === "day"
        ? shortDate(cursor)
        : unit === "week"
          ? `Mgg ${points.length + 1}`
          : unit === "month"
            ? formatDate(`${cursor}T12:00:00+07:00`, {
                month: "short",
                year: "2-digit",
              })
            : cursor.slice(0, 4) === last.slice(0, 4)
              ? cursor.slice(0, 4)
              : `${cursor.slice(0, 4)}–${last.slice(0, 4)}`;
    points.push({ start: cursor, end: last, label });
    cursor = next;
  }
  return { unit, points };
}

export function selectReports(
  expenses: readonly Expense[],
  period: PeriodSelection,
  today: string,
) {
  const snapshot = selectPeriod(period, expenses);
  const bounds = periodBounds(period);
  const days = dayCount(bounds.start, bounds.end);
  const categories: ReportCategory[] = snapshot.categories.map((category) => ({
    ...category,
    count: snapshot.expenses.filter(
      (expense) => expense.categoryCode === category.code,
    ).length,
    percent: percentage(category.amountIdr, snapshot.totalIdr),
  }));
  const ranked = [...categories]
    .filter((category) => category.count > 0)
    .sort((a, b) =>
      BigInt(a.amountIdr) === BigInt(b.amountIdr)
        ? a.code.localeCompare(b.code)
        : BigInt(a.amountIdr) > BigInt(b.amountIdr)
          ? -1
          : 1,
    );
  const previous = previousPeriod(period);
  const comparison = selectPeriod(previous, expenses);
  const before = BigInt(comparison.totalIdr);
  const difference = BigInt(snapshot.totalIdr) - before;
  const percentChange =
    before > BigInt(0)
      ? Number(
          ((difference < BigInt(0) ? -difference : difference) * BigInt(1000) +
            before / BigInt(2)) /
            before,
        ) / 10
      : null;
  const intervals = trendIntervals(bounds.start, bounds.end);
  const points = intervals.points.map((point) => {
    const data = selectPeriod(
      { kind: "range", start: point.start, end: point.end },
      snapshot.expenses,
    );
    return { ...point, totalIdr: data.totalIdr, count: data.count };
  });
  const peak = points.reduce<TrendPoint | null>(
    (best, point) =>
      BigInt(point.totalIdr) > BigInt(best?.totalIdr ?? "0") ? point : best,
    null,
  );
  const storyEnd =
    today >= bounds.start && today < bounds.end ? today : bounds.end;
  const storyStart =
    addDays(storyEnd, -6) < bounds.start ? bounds.start : addDays(storyEnd, -6);
  const story = selectPeriod(
    { kind: "range", start: storyStart, end: storyEnd },
    snapshot.expenses,
  );
  // Reopening a review after changes must show the changed snapshot as unreviewed.
  const storyKey = JSON.stringify([
    storyStart,
    storyEnd,
    story.expenses.map((expense) => [
      expense.id,
      expense.amountIdr,
      expense.categoryCode,
      expense.occurredAt,
      expense.merchant,
      expense.description,
      expense.paymentMethod,
    ]),
  ]);
  return {
    ...snapshot,
    categories,
    ranked,
    bounds,
    days,
    averageIdr: (
      (BigInt(snapshot.totalIdr) + BigInt(Math.floor(days / 2))) /
      BigInt(days)
    ).toString(),
    comparison: {
      period: previous,
      count: comparison.count,
      totalIdr: comparison.totalIdr,
      direction:
        difference < BigInt(0)
          ? "down"
          : difference > BigInt(0)
            ? "up"
            : "same",
      percent: percentChange,
    },
    trend: { unit: intervals.unit, points, peak },
    story: { ...story, start: storyStart, end: storyEnd, key: storyKey },
  };
}
export type ReportSnapshot = ReturnType<typeof selectReports>;
export function reportTransactionGroups(snapshot: ReportSnapshot) {
  return snapshot.categories
    .filter((category) => category.count > 0)
    .map((category) => ({
      category,
      expenses: categoryExpenses(snapshot.expenses, category.code),
    }));
}
export function reportText(snapshot: ReportSnapshot, period: PeriodSelection) {
  return [
    "Laporan pengeluaran · Cashly",
    reportPeriodLabel(period),
    `Total: ${formatMoney(snapshot.totalIdr)} · ${snapshot.count} transaksi`,
    `Rata-rata harian: ${formatMoney(snapshot.averageIdr)} (${snapshot.days} hari kalender)`,
    ...snapshot.categories.map(
      (category) =>
        `${category.label}: ${formatMoney(category.amountIdr)} · ${category.count} transaksi · ${category.percent}%`,
    ),
    "Waktu transaksi: WIB",
  ].join("\n");
}
export function categoryExpenses(
  expenses: readonly Expense[],
  code: string | null,
) {
  return expenses
    .filter((expense) => code === null || expense.categoryCode === code)
    .sort(
      (a, b) =>
        Date.parse(b.occurredAt) - Date.parse(a.occurredAt) ||
        a.id.localeCompare(b.id),
    );
}
