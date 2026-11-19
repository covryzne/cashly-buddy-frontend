"use client";
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  CalendarDays,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "./money-display";
import { TransactionRow } from "./transaction-row";
import {
  selectCategoryDetail,
  type CategoryDetailFilters,
} from "@/features/expenses/select-category-detail";
import type { Category, Expense } from "@/mocks/fixtures/home";
import type { PeriodSelection } from "@/lib/format/period";

export function CategoryDetail({
  category,
  expenses,
  period,
  filters,
  onFiltersChange,
  onSelect,
}: {
  category: Category;
  expenses: readonly Expense[];
  period: PeriodSelection;
  filters: CategoryDetailFilters;
  onFiltersChange: (filters: CategoryDetailFilters) => void;
  onSelect: (expense: Expense) => void;
}) {
  const snapshot = selectCategoryDetail(
    expenses,
    period,
    category.code,
    filters,
  );
  const SortIcon =
    filters.order === "newest" ? ArrowDownWideNarrow : ArrowUpWideNarrow;
  return (
    <div className="category-detail-view">
      <section
        className="category-detail-summary"
        aria-label={`Ringkasan ${category.label.toLowerCase()}`}
      >
        <span className="pill category-period">
          <CalendarDays size={12} />
          {snapshot.periodLabel}
        </span>
        <p className="category-detail-total-label">
          Total pengeluaran kategori
        </p>
        <div className="category-detail-total">
          <MoneyDisplay amountIdr={snapshot.totalIdr} />
          <span
            className={`category-comparison is-${snapshot.comparison.percent === null ? "unavailable" : snapshot.comparison.direction}`}
            title={`Dibanding ${snapshot.comparison.periodLabel}`}
          >
            {snapshot.comparison.percent === null
              ? "Belum ada pembanding"
              : snapshot.comparison.direction === "same"
                ? "Sama dengan periode lalu"
                : `${snapshot.comparison.direction === "up" ? "+" : "−"}${snapshot.comparison.percent}% vs periode lalu`}
          </span>
        </div>
        <div className="category-share">
          <p>
            <span>Porsi kategori</span>
            <span>
              <strong>{snapshot.share}%</strong> dari total periode
            </span>
          </p>
          <div
            role="progressbar"
            aria-label="Porsi kategori"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={snapshot.share}
          >
            <i style={{ width: `${snapshot.share}%` }} />
          </div>
        </div>
        <dl className="category-detail-metrics">
          <div>
            <dt>Rata-rata harian</dt>
            <dd>
              <span className="category-metric-value">
                <MoneyDisplay amountIdr={snapshot.averageIdr} />
                <small>/hari</small>
              </span>
              <small>{snapshot.days} hari kalender</small>
            </dd>
          </div>
          <div>
            <dt>Metode terbanyak</dt>
            <dd>
              <span className="category-metric-value">
                {snapshot.topMethod ? (
                  <>
                    <CreditCard size={13} />
                    {snapshot.topMethod.label} ({snapshot.topMethod.percent}%)
                  </>
                ) : (
                  "Belum ada data"
                )}
              </span>
              <small>
                {snapshot.topMethod
                  ? `${snapshot.topMethod.count} dari ${snapshot.count} transaksi`
                  : "Pembayaran belum dipilih"}
              </small>
            </dd>
          </div>
        </dl>
      </section>
      <div className="category-detail-tools">
        <div
          className="category-payment-filters"
          role="group"
          aria-label="Filter pembayaran kategori"
        >
          <button
            type="button"
            aria-pressed={snapshot.payment === null}
            onClick={() => onFiltersChange({ ...filters, payment: null })}
          >
            Semua ({snapshot.count})
          </button>
          {snapshot.methods.map((method) => (
            <button
              type="button"
              key={method.payment}
              aria-pressed={snapshot.payment === method.payment}
              onClick={() =>
                onFiltersChange({ ...filters, payment: method.payment })
              }
            >
              {method.label} ({method.count})
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          aria-label={`Urutkan: ${filters.order === "newest" ? "terbaru" : "terlama"} dahulu`}
          onClick={() =>
            onFiltersChange({
              ...filters,
              order: filters.order === "newest" ? "oldest" : "newest",
            })
          }
        >
          <SortIcon size={14} />
          {filters.order === "newest" ? "Terbaru" : "Terlama"}
        </Button>
      </div>
      <p className="category-result-count" role="status">
        Menampilkan {snapshot.rows.length} dari {snapshot.count} transaksi
      </p>
      {snapshot.rows.length ? (
        <ul className="category-transaction-list">
          {snapshot.rows.map((expense) => (
            <li key={expense.id}>
              <TransactionRow
                variant="category"
                expense={expense}
                category={category}
                onSelect={() => onSelect(expense)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="category-detail-empty">
          <p>
            Belum ada pengeluaran {category.label.toLowerCase()} pada pilihan
            ini.
          </p>
          <small>Pilih periode lain atau mulai catatan pengeluaranmu.</small>
        </div>
      )}
    </div>
  );
}
