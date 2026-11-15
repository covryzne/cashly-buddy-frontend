import { test, expect } from "@playwright/test";
import { activityExpenses } from "../src/mocks/fixtures/activity";
import {
  dayCount,
  previousPeriod,
  selectReports,
  reportText,
  reportTransactionGroups,
} from "../src/features/reports/select-reports";
const month = { kind: "month", month: "2026-11" } as const;

test("Rincian cetak mencakup transaksi periode sekali saja, urut dan subtotal sesuai", () => {
  const source = [...activityExpenses].reverse();
  const snapshot = selectReports(
    source,
    { kind: "range", start: "2026-11-09", end: "2026-11-15" },
    "2026-11-15",
  );
  const groups = reportTransactionGroups(snapshot);
  const rows = groups.flatMap((group) => group.expenses);
  expect(groups.map((group) => group.category.label)).toEqual([
    "Makanan",
    "Transportasi",
    "Tagihan",
  ]);
  expect(rows).toHaveLength(4);
  expect(new Set(rows.map((row) => row.id)).size).toBe(4);
  for (const { category, expenses } of groups) {
    expect(expenses.every((row) => row.categoryCode === category.code)).toBe(
      true,
    );
    expect(
      expenses.reduce((sum, row) => sum + BigInt(row.amountIdr), BigInt(0)).toString(),
    ).toBe(category.amountIdr);
    expect(expenses.map((row) => Date.parse(row.occurredAt))).toEqual(
      expenses.map((row) => Date.parse(row.occurredAt)).sort((a, b) => b - a),
    );
  }
  expect(source).toEqual([...activityExpenses].reverse());
  expect(
    reportTransactionGroups(
      selectReports(source, { kind: "month", month: "2026-10" }, "2026-11-15"),
    ),
  ).toEqual([]);
});

test("Laporan menghitung total, rata-rata kalender dan distribusi tanpa pembanding palsu", () => {
  const result = selectReports(activityExpenses, month, "2026-11-15");
  expect(result.totalIdr).toBe("1248500");
  expect(result.count).toBe(6);
  expect(result.days).toBe(30);
  expect(result.averageIdr).toBe("41617");
  expect(result.ranked[0].percent).toBe(46.5);
  expect(result.ranked[0].count).toBe(2);
  expect(result.comparison.percent).toBeNull();
  expect(result.trend.points.map((point) => point.totalIdr)).toEqual([
    "38500",
    "100000",
    "1110000",
    "0",
    "0",
    "0",
  ]);
  expect(
    result.trend.points
      .reduce((sum, point) => sum + BigInt(point.totalIdr), BigInt(0))
      .toString(),
  ).toBe(result.totalIdr);
  expect(result.story.start).toBe("2026-11-09");
  expect(result.story.end).toBe("2026-11-15");
  expect(result.story.count).toBe(4);
  expect(reportText(result, month)).toContain("Rp1.248.500 · 6 transaksi");
});
test("Pembanding rentang sama panjang, pergantian tahun, WIB dan tahun kabisat", () => {
  expect(previousPeriod({ kind: "month", month: "2027-01" })).toEqual({
    kind: "month",
    month: "2026-12",
  });
  expect(
    previousPeriod({ kind: "range", start: "2026-11-09", end: "2026-11-15" }),
  ).toEqual({ kind: "range", start: "2026-11-02", end: "2026-11-08" });
  expect(dayCount("2028-02-01", "2028-02-29")).toBe(29);
  const data = [{ ...activityExpenses[0], occurredAt: "2026-10-31T17:00:00Z" }];
  const result = selectReports(
    data,
    { kind: "range", start: "2026-11-01", end: "2026-11-01" },
    "2026-11-15",
  );
  expect(result.totalIdr).toBe("28000");
  expect(result.averageIdr).toBe("28000");
  expect(result.trend.unit).toBe("day");
});
test("Persentase pembanding aktual, rentang kosong dan nominal besar tetap presisi", () => {
  const week = selectReports(
    activityExpenses,
    { kind: "range", start: "2026-11-09", end: "2026-11-15" },
    "2026-11-15",
  );
  expect(week.comparison.totalIdr).toBe("100000");
  expect(week.comparison.percent).toBe(1010);
  expect(week.comparison.direction).toBe("up");
  const empty = selectReports([], month, "2026-11-15");
  expect(empty.averageIdr).toBe("0");
  expect(empty.ranked).toEqual([]);
  expect(empty.trend.peak).toBeNull();
  expect(empty.comparison.percent).toBeNull();
  const huge = selectReports(
    [
      { ...activityExpenses[0], amountIdr: "999999999999999999999" },
      { ...activityExpenses[1], amountIdr: "2" },
    ],
    month,
    "2026-11-15",
  );
  expect(huge.totalIdr).toBe("1000000000000000000001");
  expect(huge.ranked[0].percent).toBe(100);
});
test("Tren panjang tetap terbatas, interval tidak tumpang tindih dan tidak kehilangan nominal", () => {
  for (const [start, end, unit] of [
    ["2026-01-15", "2026-12-15", "month"],
    ["2000-01-01", "2099-12-31", "year"],
  ] as const) {
    const result = selectReports(
      activityExpenses,
      { kind: "range", start, end },
      "2026-11-15",
    );
    expect(result.trend.unit).toBe(unit);
    expect(result.trend.points.length).toBeLessThanOrEqual(13);
    expect(result.trend.points[0].start).toBe(start);
    expect(result.trend.points.at(-1)?.end).toBe(end);
    expect(
      result.trend.points
        .reduce((sum, point) => sum + BigInt(point.totalIdr), BigInt(0))
        .toString(),
    ).toBe(result.totalIdr);
  }
});
test("Cerita minggu berubah ketika catatan terkait diedit", () => {
  const before = selectReports(activityExpenses, month, "2026-11-15");
  const after = selectReports(
    activityExpenses.map((expense, index) =>
      index ? expense : { ...expense, amountIdr: "35000" },
    ),
    month,
    "2026-11-15",
  );
  expect(before.story.key).not.toBe(after.story.key);
  expect(after.totalIdr).toBe("1255500");
  expect(after.story.totalIdr).toBe("1117000");
});
