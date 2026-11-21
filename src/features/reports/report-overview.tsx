"use client";

import { ArrowRight, ChartNoAxesColumn, Info, PieChart, ReceiptText, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/finance/money-display";
import { SpendingCategoryChart } from "@/components/finance/spending-category-chart";
import { SpendingTrendChart } from "@/components/finance/spending-trend-chart";
import { reportPeriodLabel, type ReportSnapshot } from "./select-reports";

const units = { day: "harian", week: "mingguan", month: "bulanan", year: "per tahun" };
const ignore = () => {};

export function ReportOverview({
  snapshot, periodLabel, timezoneLabel = "WIB", selectedCategory = null, selectedTrend = null, point,
  onAdd, onCategory = ignore, onSelectCategory = ignore, onSelectTrend = ignore, onTrend,
}: {
  snapshot: ReportSnapshot;
  periodLabel: string;
  timezoneLabel?: string;
  selectedCategory?: string | null;
  selectedTrend?: string | null;
  point?: ReportSnapshot["trend"]["points"][number] | null;
  onAdd?: () => void;
  onCategory?: (code: string | null) => void;
  onSelectCategory?: (code: string | null) => void;
  onSelectTrend?: (start: string) => void;
  onTrend?: (start: string, end: string) => void;
}) {
  return (
    <>
    <section
      className="report-card report-summary"
      aria-label="Ringkasan laporan"
    >
      <div className="report-summary-top">
        <span>Total pengeluaran</span>
        <span className="pill">
          <ReceiptText size={12} />
          {snapshot.count} transaksi
        </span>
      </div>
      <MoneyDisplay
        amountIdr={snapshot.totalIdr}
        className="report-total"
      />
      <p className="report-scope">{periodLabel} · {timezoneLabel}</p>
      <div className="report-summary-stats">
        <div>
          <span>
            <i className="report-stat-dot" />
            Perbandingan periode
          </span>
          <strong>
            {snapshot.comparison.percent === null ? (
              <>
                <Info size={15} /> Belum ada pembanding
              </>
            ) : (
              <>
                {snapshot.comparison.direction === "down" ? (
                  <TrendingDown size={16} />
                ) : (
                  <TrendingUp size={16} />
                )}
                {snapshot.comparison.direction === "same"
                  ? "Sama dengan sebelumnya"
                  : `${snapshot.comparison.direction === "down" ? "Turun" : "Naik"} ${snapshot.comparison.percent}%`}
              </>
            )}
          </strong>
          <small>
            {snapshot.comparison.count
              ? `dibanding ${reportPeriodLabel(snapshot.comparison.period)}`
              : `Belum ada catatan pada ${reportPeriodLabel(snapshot.comparison.period)}.`}
          </small>
        </div>
        <div>
          <span>
            <i className="report-stat-dot is-primary" />
            Rata-rata harian
          </span>
          <strong>
            <MoneyDisplay amountIdr={snapshot.averageIdr} />
            <small>/ hari</small>
          </strong>
          <small>{snapshot.days} hari kalender</small>
        </div>
      </div>
    </section>
    {!snapshot.count && (
      <section className="report-empty" aria-label="Laporan kosong">
        <ReceiptText size={24} />
        <div>
          <h3>Belum ada pengeluaran di periode ini.</h3>
          <p>Coba periode lain atau mulai catatan pengeluaranmu.</p>
        </div>
        {onAdd && <Button variant="secondary" onClick={onAdd}>Catat pengeluaran</Button>}
      </section>
    )}
    <div className="report-grid">
      <section
        className="report-card report-distribution"
        aria-labelledby="report-distribution-title"
      >
        <div className="report-card-heading">
          <PieChart size={19} />
          <h3 id="report-distribution-title">Distribusi Kategori</h3>
          <span>{snapshot.ranked.length} kategori</span>
        </div>
        <SpendingCategoryChart
          categories={snapshot.categories}
          selectedCode={selectedCategory}
          onSelect={onSelectCategory}
          onDetails={onCategory}
        />
      </section>
      <section
        className="report-card report-trend"
        aria-labelledby="report-trend-title"
      >
        <div className="report-card-heading">
          <ChartNoAxesColumn size={19} />
          <h3 id="report-trend-title">Tren Pengeluaran</h3>
        </div>
        <p className="report-card-description">
          Jejak pengeluaran {units[snapshot.trend.unit]} pada periode
          pilihanmu.
        </p>
        <SpendingTrendChart
          points={snapshot.trend.points}
          selectedStart={selectedTrend}
          onSelect={onSelectTrend}
        />
        {onTrend && point && point.count > 0 && (
          <Button
            variant="ghost"
            onClick={() =>
              onTrend(point.start, point.end)
            }
          >
            Lihat {point.count} transaksi periode ini{" "}
            <ArrowRight size={15} />
          </Button>
        )}
      </section>
    </div>
    </>
  );
}
