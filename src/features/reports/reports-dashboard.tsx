"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesColumn,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Info,
  PieChart,
  Printer,
  ReceiptText,
  Share2,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AppNavigation } from "@/components/shared/app-navigation";
import { AppPageHeader } from "@/components/shared/app-page-header";
import {
  AppActionDialogs,
  isAppAction,
  type AppActionPanel,
} from "@/components/shared/app-action-dialogs";
import { useModalStack } from "@/components/shared/use-modal-stack";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/finance/money-display";
import { PeriodPicker } from "@/components/finance/period-picker";
import { SpendingCategoryChart } from "@/components/finance/spending-category-chart";
import { SpendingTrendChart } from "@/components/finance/spending-trend-chart";
import { TransactionRow } from "@/components/finance/transaction-row";
import {
  ExpenseDetail,
  ExpenseDetailActions,
} from "@/components/finance/expense-detail";
import { WeeklyStory } from "@/components/finance/weekly-story";
import { ReportExportPreview } from "@/components/finance/report-export-preview";
import { ReportPrintDetails } from "@/components/finance/report-print-details";
import { useExpenseSession } from "@/features/expenses/expense-session";
import { monthKey } from "@/features/home/select-month";
import { homeFixture } from "@/mocks/fixtures/home";
import { useCalendarDay } from "@/lib/use-calendar-day";
import {
  addDays,
  dateKey,
  rangeLabel,
  type PeriodSelection,
} from "@/lib/format/period";
import {
  categoryExpenses,
  previousPeriod,
  reportPeriodLabel,
  reportText,
  selectReports,
} from "./select-reports";

type Panel =
  | AppActionPanel
  | { kind: "period" | "story" | "export" }
  | { kind: "category"; code: string | null }
  | { kind: "trend"; start: string; end: string }
  | { kind: "detail"; id: string };
const units = {
  day: "harian",
  week: "mingguan",
  month: "bulanan",
  year: "per tahun",
};

export function ReportsDashboard() {
  const session = useExpenseSession();
  const today = useCalendarDay(homeFixture.asOf);
  const currentMonth: PeriodSelection = {
    kind: "month",
    month: monthKey(`${today}T12:00:00+07:00`),
  };
  const [override, setOverride] = useState<PeriodSelection | null>(null);
  const period = override ?? currentMonth;
  const snapshot = selectReports(session.expenses, period, today);
  const [category, setCategory] = useState<string | null>(null);
  const selectedCategory = category;
  const [trend, setTrend] = useState<string | null>(null);
  const selectedTrend = snapshot.trend.points.some(
    (point) => point.start === trend,
  )
    ? trend
    : (snapshot.trend.peak?.start ?? snapshot.trend.points[0]?.start ?? null);
  const point = snapshot.trend.points.find(
    (entry) => entry.start === selectedTrend,
  );
  const [reviewedKey, setReviewedKey] = useState<string | null>(null);
  const reviewed = reviewedKey === snapshot.story.key;
  const [exportFeedback, setExportFeedback] = useState("");
  const [exportTextVisible, setExportTextVisible] = useState(false);
  const exportText = useRef<HTMLTextAreaElement>(null);
  const { panel, open, push, back, close, canGoBack } = useModalStack<Panel>();
  const lastSeven: PeriodSelection = {
    kind: "range",
    start: addDays(today, -6),
    end: today,
  };
  const previousMonth = previousPeriod(currentMonth);
  const presets = [
    { label: "Bulan ini", period: currentMonth },
    { label: "7 hari terakhir", period: lastSeven },
    { label: reportPeriodLabel(previousMonth), period: previousMonth },
  ];
  const periodEqual = (other: PeriodSelection) =>
    JSON.stringify(period) === JSON.stringify(other);
  function choosePeriod(value: PeriodSelection | null) {
    setOverride(value);
    setCategory(null);
    setTrend(null);
  }
  function openExport() {
    setExportFeedback("");
    setExportTextVisible(false);
    open({ kind: "export" });
  }
  async function copyReport() {
    try {
      await navigator.clipboard.writeText(reportText(snapshot, period));
      setExportFeedback("Ringkasan berhasil disalin.");
    } catch {
      setExportFeedback(
        "Pilih dan salin teks ringkasan di bawah secara manual.",
      );
      setExportTextVisible(true);
      requestAnimationFrame(() => {
        exportText.current?.focus();
        exportText.current?.select();
      });
    }
  }
  const active =
    panel?.kind === "detail"
      ? session.expenses.find((expense) => expense.id === panel.id)
      : undefined;
  const modalRows =
    panel?.kind === "category"
      ? categoryExpenses(snapshot.expenses, panel.code)
      : panel?.kind === "trend"
        ? snapshot.expenses
            .filter(
              (expense) =>
                dateKey(expense.occurredAt) >= panel.start &&
                dateKey(expense.occurredAt) <= panel.end,
            )
            .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
        : [];
  const modalTitle =
    panel?.kind === "period"
      ? "Pilih periode laporan"
      : panel?.kind === "story"
        ? "Cerita uang mingguan"
        : panel?.kind === "export"
          ? "Ekspor ringkasan"
          : panel?.kind === "detail"
            ? "Detail pengeluaran"
            : panel?.kind === "category"
              ? panel.code === null
                ? "Semua transaksi"
                : "Rincian kategori"
              : "Rincian tren";

  return (
    <>
      <a className="skip-link" href="#reports-main">
        Langsung ke konten
      </a>
      <AppNavigation
        activePage="reports"
        onAdd={() => open({ kind: "add" })}
        onUpcoming={() => open({ kind: "profile" })}
      />
      <div className="app-shell reports-page">
        <AppPageHeader
          title="Laporan"
          description="Kenali cerita di balik pengeluaranmu"
          icon={BookOpen}
        />
        <main id="reports-main" className="reports-main">
          <div className="report-heading">
            <div>
              <p>Analisis finansial</p>
              <h2>Laporan Pengeluaran</h2>
            </div>
            <Button
              variant="outline"
              aria-label="Pilih periode laporan"
              onClick={() => open({ kind: "period" })}
            >
              <CalendarDays size={19} />
            </Button>
            <Button
              variant="outline"
              aria-label="Bagikan ringkasan laporan"
              onClick={openExport}
            >
              <Share2 size={18} />
            </Button>
          </div>
          <div
            className="report-period-presets"
            role="group"
            aria-label="Periode laporan"
          >
            {presets.map((preset) => (
              <button
                type="button"
                key={preset.label}
                aria-pressed={periodEqual(preset.period)}
                onClick={() => choosePeriod(preset.period)}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={
                !presets.some((preset) => periodEqual(preset.period))
              }
              onClick={() => open({ kind: "period" })}
            >
              Pilih tanggal <CalendarDays size={14} />
            </button>
          </div>
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
            <p className="report-scope">{reportPeriodLabel(period)} · WIB</p>
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
              <Button variant="secondary" onClick={() => open({ kind: "add" })}>
                Catat pengeluaran
              </Button>
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
                onSelect={setCategory}
                onDetails={(code) => open({ kind: "category", code })}
              />
            </section>
            <section
              className="report-card report-story-card"
              aria-labelledby="report-story-title"
            >
              <div className="report-card-heading">
                <Sparkles size={19} />
                <h3 id="report-story-title">Cerita Uang Mingguan</h3>
                {reviewed && (
                  <CheckCircle2 size={17} aria-label="Review selesai" />
                )}
              </div>
              <div className="report-story-content">
                <Image
                  src="/mascot/mochi-crown-transparent.webp"
                  alt="Mochi"
                  width={52}
                  height={52}
                />
                <div>
                  <span>
                    {rangeLabel(snapshot.story.start, snapshot.story.end)}
                  </span>
                  <p>
                    {snapshot.story.count ? (
                      <>
                        Ada <strong>{snapshot.story.count} pengeluaran</strong>{" "}
                        dengan total{" "}
                        <MoneyDisplay amountIdr={snapshot.story.totalIdr} />.
                        Yuk, lihat kembali cerita kecil di balik catatanmu.
                      </>
                    ) : (
                      "Belum ada catatan dalam minggu ini. Cerita pengeluaranmu akan muncul di sini."
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => open({ kind: "story" })}
                disabled={!snapshot.story.count}
              >
                Buka Money Story lengkap <ArrowRight size={16} />
              </Button>
              {reviewed && (
                <p className="report-reviewed" role="status">
                  <CheckCircle2 size={14} /> Minggu ini sudah kamu tinjau.
                </p>
              )}
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
                onSelect={setTrend}
              />
              {point && point.count > 0 && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    open({ kind: "trend", start: point.start, end: point.end })
                  }
                >
                  Lihat {point.count} transaksi periode ini{" "}
                  <ArrowRight size={15} />
                </Button>
              )}
            </section>
          </div>
          <section className="report-export-card" aria-label="Unduh laporan">
            <span className="report-export-icon">
              <Download size={21} />
            </span>
            <div>
              <h3>Unduh Ringkasan PDF</h3>
              <p>Ringkasan dan rincian transaksi per kategori.</p>
            </div>
            <Button variant="outline" onClick={openExport}>
              Unduh
            </Button>
          </section>
          <ReportPrintDetails
            snapshot={snapshot}
            periodLabel={reportPeriodLabel(period)}
          />
        </main>
      </div>
      {panel && isAppAction(panel) && (
        <AppActionDialogs
          panel={panel}
          push={push}
          back={back}
          close={close}
          canGoBack={canGoBack}
          returnLabel="Kembali ke Laporan"
        />
      )}
      {panel && !isAppAction(panel) && (
        <Dialog
          title={modalTitle}
          onBack={canGoBack ? back : undefined}
          onClose={close}
          variant={
            panel.kind === "detail" || panel.kind === "export"
              ? "sheet"
              : "default"
          }
          className={
            panel.kind === "detail"
              ? "expense-detail-dialog"
              : panel.kind === "export"
                ? "report-dialog report-export-dialog"
                : "report-dialog"
          }
          footer={
            panel.kind === "story" ? (
              <Button
                disabled={reviewed || !snapshot.story.count}
                onClick={() => {
                  setReviewedKey(snapshot.story.key);
                  close();
                }}
              >
                <Check size={17} />
                {reviewed ? "Sudah ditinjau" : "Selesai review"}
              </Button>
            ) : panel.kind === "detail" ? (
              <ExpenseDetailActions onDone={close} />
            ) : panel.kind === "export" ? (
              <div className="report-export-actions">
                <Button variant="secondary" onClick={copyReport}>
                  <Copy size={16} />
                  Salin ringkasan
                </Button>
                <Button onClick={() => window.print()}>
                  <Printer size={16} />
                  Cetak / PDF
                </Button>
              </div>
            ) : undefined
          }
        >
          {panel.kind === "period" && (
            <PeriodPicker
              selection={period}
              onApply={(value) => {
                choosePeriod(value);
                close();
              }}
            />
          )}
          {panel.kind === "story" && (
            <WeeklyStory
              totalIdr={snapshot.story.totalIdr}
              count={snapshot.story.count}
              categories={snapshot.story.categories}
              periodLabel={rangeLabel(snapshot.story.start, snapshot.story.end)}
            />
          )}
          {(panel.kind === "category" || panel.kind === "trend") && (
            <div className="report-drilldown">
              <p className="pill">
                {panel.kind === "category"
                  ? `${panel.code === null ? "Semua kategori" : homeFixture.categories.find((entry) => entry.code === panel.code)?.label} · ${reportPeriodLabel(period)}`
                  : rangeLabel(panel.start, panel.end)}
              </p>
              <p>{modalRows.length} transaksi</p>
              <div>
                {modalRows.map((expense) => (
                  <TransactionRow
                    key={expense.id}
                    expense={expense}
                    category={homeFixture.categories.find(
                      (entry) => entry.code === expense.categoryCode,
                    )!}
                    onSelect={() => push({ kind: "detail", id: expense.id })}
                  />
                ))}
              </div>
            </div>
          )}
          {panel.kind === "detail" && active && (
            <ExpenseDetail
              expense={active}
              category={homeFixture.categories.find(
                (entry) => entry.code === active.categoryCode,
              )!}
              period={reportPeriodLabel(period)}
            />
          )}
          {panel.kind === "export" && (
            <ReportExportPreview
              snapshot={snapshot}
              periodLabel={reportPeriodLabel(period)}
              digestTitle={
                period.kind === "month"
                  ? "Cashly Monthly Digest"
                  : snapshot.days === 7
                    ? "Cashly Weekly Digest"
                    : "Cashly Spending Digest"
              }
              text={reportText(snapshot, period)}
              showText={exportTextVisible}
              onToggleText={() => setExportTextVisible((current) => !current)}
              textRef={exportText}
              feedback={exportFeedback}
            />
          )}
        </Dialog>
      )}
    </>
  );
}
