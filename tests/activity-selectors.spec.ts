import { test, expect } from "@playwright/test";
import { activityExpenses } from "../src/mocks/fixtures/activity";
import {
  defaultActivityFilters as defaults,
  selectActivity,
  periodBounds,
  weekStart,
  expenseDraft,
} from "../src/features/activity/select-activity";
import { receiptSchema } from "../src/features/scan/receipt-schema";

const month = { kind: "month", month: "2026-11" } as const;
const select = (filters = defaults, query = "") =>
  selectActivity(activityExpenses, month, filters, query, "all", "2026-11-13");

test("Aktivitas menghitung total, kategori dan tag dari transaksi Beranda", () => {
  const result = select();
  expect(result.totalIdr).toBe("1248500");
  expect(result.count).toBe(6);
  expect(result.days).toBe(5);
  expect(result.dominant?.code).toBe("food_drink");
  expect(result.dominant?.percent).toBe(46);
  expect(select({ ...defaults, category: "food_drink" }).totalIdr).toBe(
    "580000",
  );
  expect(select(defaults, " #kopisiang ").totalIdr).toBe("28000");
  expect(select(defaults, "MAKANAN").count).toBe(2);
  expect(select(defaults, "tidak ada").dominant).toBeNull();
  expect(select(defaults, "tidak ada").totalIdr).toBe("0");
});

test("Filter sumber dan pembayaran dapat digabung tanpa mengubah fixture", () => {
  expect(select({ ...defaults, source: "voice" }).totalIdr).toBe("248500");
  expect(
    select({ ...defaults, source: "voice", payment: "Transfer bank" }).count,
  ).toBe(1);
  expect(
    select({ ...defaults, source: "voice", category: "food_drink" }).count,
  ).toBe(0);
  expect(select({ ...defaults, order: "oldest" }).expenses[0].id).toBe(
    "demo-6",
  );
  expect(activityExpenses[0].id).toBe("demo-1");
});

test("Rentang inklusif, harian dan pekan Senin memakai tanggal WIB", () => {
  const range = selectActivity(
    activityExpenses,
    { kind: "range", start: "2026-11-12", end: "2026-11-13" },
    defaults,
    "",
    "all",
    "2026-11-13",
  );
  expect(range.totalIdr).toBe("558000");
  expect(range.groups.map((group) => group.totalIdr)).toEqual([
    "348000",
    "210000",
  ]);
  const day = selectActivity(
    activityExpenses,
    month,
    defaults,
    "",
    "day",
    "2026-11-13",
  );
  expect(day.count).toBe(2);
  expect(day.totalIdr).toBe("348000");
  const weeks = selectActivity(
    activityExpenses,
    month,
    defaults,
    "",
    "week",
    "2026-11-13",
  );
  expect(weeks.groups.map(({ key, totalIdr }) => [key, totalIdr])).toEqual([
    ["2026-11-09", "1110000"],
    ["2026-11-02", "100000"],
    ["2026-10-26", "38500"],
  ]);
  expect(weekStart("2026-11-01")).toBe("2026-10-26");
  expect(periodBounds({ kind: "month", month: "2028-02" }).end).toBe(
    "2028-02-29",
  );
  const boundary = [
    { ...activityExpenses[0], occurredAt: "2026-10-31T17:00:00Z" },
  ];
  expect(
    selectActivity(boundary, month, defaults, "", "day", "2026-11-01").count,
  ).toBe(1);
});

test("Urutan waktu tidak bergantung offset dan nominal besar tetap presisi", () => {
  const rows = [
    {
      ...activityExpenses[0],
      id: "a",
      occurredAt: "2026-11-13T13:00:00+07:00",
      amountIdr: "999999999999999999",
    },
    {
      ...activityExpenses[1],
      id: "b",
      occurredAt: "2026-11-13T07:00:00Z",
      amountIdr: "2",
    },
  ];
  const result = selectActivity(rows, month, defaults, "", "all", "2026-11-13");
  expect(result.expenses[0].id).toBe("b");
  expect(result.totalIdr).toBe("1000000000000000001");
});

test("Transaksi dapat dibuka pada form rincian bersama tanpa kehilangan waktu", () => {
  const draft = expenseDraft(activityExpenses[0]);
  expect(draft.occurredDate).toBe("2026-11-13");
  expect(draft.occurredTime).toBe("13:45");
  expect(draft.items[0].priceIdr).toBe("28000");
  expect(receiptSchema.safeParse(draft).success).toBe(true);
});
