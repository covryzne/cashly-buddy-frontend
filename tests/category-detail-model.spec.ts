import { test, expect } from "@playwright/test";
import { homeFixture } from "../src/mocks/fixtures/home";
import {
  defaultCategoryDetailFilters as defaults,
  selectCategoryDetail,
} from "../src/features/expenses/select-category-detail";
const month = { kind: "month", month: "2026-11" } as const;
test("Kategori memakai total, share, rata-rata kalender dan metode nyata", () => {
  const data = selectCategoryDetail(homeFixture.expenses, month, "food_drink");
  expect(data.totalIdr).toBe("580000");
  expect(data.count).toBe(2);
  expect(data.share).toBe(46.5);
  expect(data.averageIdr).toBe("19333");
  expect(data.days).toBe(30);
  expect(data.topMethod?.label).toBe("QRIS");
  expect(data.topMethod?.percent).toBe(100);
  expect(data.comparison.percent).toBeNull();
  expect(data.rows.map((expense) => expense.id)).toEqual(["demo-1", "demo-4"]);
});
test("Filter pembayaran hanya mengubah list dan metode kosong dapat dipilih", () => {
  const records = homeFixture.expenses.map((expense) =>
    expense.id === "demo-4" ? { ...expense, paymentMethod: "" } : expense,
  );
  const data = selectCategoryDetail(records, month, "food_drink", {
    ...defaults,
    payment: "",
  });
  expect(data.rows.map((expense) => expense.id)).toEqual(["demo-4"]);
  expect(data.totalIdr).toBe("580000");
  expect(data.count).toBe(2);
  expect(data.topMethod?.percent).toBe(50);
  expect(
    selectCategoryDetail(records, month, "food_drink", {
      ...defaults,
      payment: "not-available",
    }).payment,
  ).toBeNull();
});
test("Perbandingan kategori dan rentang inklusif dihitung dari periode benar", () => {
  const records = [
    ...homeFixture.expenses,
    {
      ...homeFixture.expenses[0],
      id: "previous",
      occurredAt: "2026-10-10T04:00:00Z",
      amountIdr: "290000",
    },
  ];
  expect(
    selectCategoryDetail(records, month, "food_drink").comparison.percent,
  ).toBe(100);
  const data = selectCategoryDetail(
    records,
    { kind: "range", start: "2026-11-12", end: "2026-11-13" },
    "food_drink",
  );
  expect(data.totalIdr).toBe("28000");
  expect(data.averageIdr).toBe("14000");
  expect(data.days).toBe(2);
  expect(data.share).toBe(5);
});
test("Nominal besar, empty state dan pergantian hari WIB aman", () => {
  const records = [
    {
      ...homeFixture.expenses[0],
      amountIdr: "999999999999999999",
      occurredAt: "2026-10-31T17:00:00Z",
    },
    { ...homeFixture.expenses[3], amountIdr: "2" },
  ];
  const data = selectCategoryDetail(records, month, "food_drink");
  expect(data.totalIdr).toBe("1000000000000000001");
  expect(data.share).toBe(100);
  const empty = selectCategoryDetail([], month, "food_drink");
  expect(empty.totalIdr).toBe("0");
  expect(empty.averageIdr).toBe("0");
  expect(empty.share).toBe(0);
  expect(empty.topMethod).toBeNull();
});
test("Urutan waktu memakai timestamp numerik walau offset berbeda", () => {
  const records = [
    { ...homeFixture.expenses[0], occurredAt: "2026-11-13T13:00:00+07:00" },
    { ...homeFixture.expenses[3], occurredAt: "2026-11-13T07:00:00Z" },
  ];
  expect(selectCategoryDetail(records, month, "food_drink").rows[0].id).toBe(
    "demo-4",
  );
  expect(
    selectCategoryDetail(records, month, "food_drink", {
      ...defaults,
      order: "oldest",
    }).rows[0].id,
  ).toBe("demo-1");
});
