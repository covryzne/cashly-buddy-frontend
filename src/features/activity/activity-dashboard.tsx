"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  Search,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  WifiOff,
  X,
} from "lucide-react";
import { AppNavigation } from "@/components/shared/app-navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ProfileOverview } from "@/components/shared/profile-overview";
import { InstallGuide } from "@/components/shared/install-app";
import { FeaturePreview } from "@/components/shared/feature-preview";
import { useModalStack } from "@/components/shared/use-modal-stack";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { MoneyDisplay } from "@/components/finance/money-display";
import { CategoryIcon } from "@/components/finance/category-icon";
import { TransactionRow } from "@/components/finance/transaction-row";
import { PeriodPicker } from "@/components/finance/period-picker";
import {
  ExpenseDetail,
  ExpenseDetailActions,
} from "@/components/finance/expense-detail";
import { ReceiptReview } from "@/components/finance/receipt-review";
import { QuickAddMethods } from "@/components/finance/quick-add-methods";
import { ScanReceiptFlow } from "@/features/scan/scan-receipt-flow";
import { ChatBatchFlow } from "@/features/expenses/chat-batch-flow";
import { VoiceReceiptFlow } from "@/features/expenses/voice-receipt-flow";
import { useExpenseSession } from "@/features/expenses/expense-session";
import {
  receiptSchema,
  type ReceiptDraft,
} from "@/features/scan/receipt-schema";
import { homeFixture } from "@/mocks/fixtures/home";
import { type ActivityExpense } from "@/mocks/fixtures/activity";
import {
  calendarDate,
  calendarDateKey,
  dateKey,
  type PeriodSelection,
} from "@/lib/format/period";
import { formatDate } from "@/lib/format/datetime";
import { useCalendarDay } from "@/lib/use-calendar-day";
import { useSyncExternalStore } from "react";
import { ActivityFilterForm } from "./activity-filters";
import {
  activityGroupLabel,
  activityPeriodLabel,
  addDays,
  currentActivityMonth,
  defaultActivityFilters,
  expenseDraft,
  inPeriod,
  periodBounds,
  selectActivity,
  type ActivityFilters,
  type ActivityView,
} from "./select-activity";

type Panel =
  | { kind: "filters" }
  | { kind: "period"; fromFilter?: boolean }
  | { kind: "day" }
  | { kind: "detail" | "edit" | "delete"; id: string }
  | { kind: "add" | "scan" | "chat" | "voice" | "profile" | "install" }
  | { kind: "upcoming"; label: string };
const views = [
  { value: "all", label: "Semua" },
  { value: "day", label: "Harian" },
  { value: "week", label: "Mingguan" },
] as const;
const subscribeOnline = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};

export function ActivityDashboard() {
  const session = useExpenseSession();
  const today = useCalendarDay(homeFixture.asOf);
  const defaultPeriod: PeriodSelection = {
    kind: "month",
    month: currentActivityMonth(today),
  };
  const [periodOverride, setPeriodOverride] = useState<PeriodSelection | null>(
    null,
  );
  const period = periodOverride ?? defaultPeriod;
  const [filters, setFilters] = useState<ActivityFilters>(
    defaultActivityFilters,
  );
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ActivityView>("all");
  const [focusedDay, setFocusedDay] = useState<string | null>(null);
  const bounds = periodBounds(period);
  const latest = session.expenses
    .filter((expense) => inPeriod(expense, period))
    .map((expense) => dateKey(expense.occurredAt))
    .sort()
    .at(-1);
  const day =
    focusedDay && focusedDay >= bounds.start && focusedDay <= bounds.end
      ? focusedDay
      : (latest ??
        (today < bounds.start
          ? bounds.start
          : today > bounds.end
            ? bounds.end
            : today));
  const snapshot = selectActivity(
    session.expenses,
    period,
    filters,
    query,
    view,
    day,
  );
  const [filterDraft, setFilterDraft] = useState(filters);
  const [draftPeriod, setDraftPeriod] = useState(period);
  const [editDraft, setEditDraft] = useState<ReceiptDraft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleted, setDeleted] = useState<ActivityExpense | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const { panel, open, push, close, back, canGoBack } = useModalStack<Panel>();
  const search = useRef<HTMLInputElement>(null);
  const undo = useRef<HTMLButtonElement>(null);
  const formId = useId();
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const active =
    panel && "id" in panel
      ? session.expenses.find((expense) => expense.id === panel.id)
      : undefined;
  const payments = Array.from(
    new Set(session.expenses.map((expense) => expense.paymentMethod)),
  ).sort();
  const countFilters =
    Number(filters.category !== "all") +
    Number(filters.source !== "all") +
    Number(filters.payment !== "all") +
    Number(filters.order !== "newest");
  const title =
    panel?.kind === "filters"
      ? "Filter aktivitas"
      : panel?.kind === "period"
        ? "Pilih periode"
        : panel?.kind === "day"
          ? "Pilih hari"
          : panel?.kind === "detail"
            ? "Detail pengeluaran"
            : panel?.kind === "edit"
              ? "Ubah pengeluaran"
              : panel?.kind === "delete"
                ? "Hapus pengeluaran?"
                : panel?.kind === "add"
                  ? "Catat pengeluaran baru"
                  : panel?.kind === "profile"
                    ? "Profil"
                    : panel?.kind === "install"
                      ? "Download Cashly"
                      : panel?.kind === "upcoming"
                        ? panel.label
                        : "";

  function openFilters() {
    setFilterDraft(filters);
    setDraftPeriod(period);
    open({ kind: "filters" });
  }
  function applyPeriod(selection: PeriodSelection | null) {
    const value = selection ?? defaultPeriod;
    if (panel?.kind === "period" && panel.fromFilter) {
      setDraftPeriod(value);
      back();
    } else {
      setPeriodOverride(selection);
      setFocusedDay(null);
      close();
    }
  }
  function applyFilters() {
    setFilters(filterDraft);
    setPeriodOverride(draftPeriod);
    setFocusedDay(null);
    close();
  }
  function resetFilters() {
    setFilters(defaultActivityFilters);
    setQuery("");
    setView("all");
  }
  function beginEdit() {
    if (!active) return;
    setEditDraft(expenseDraft(active));
    setErrors({});
    push({ kind: "edit", id: active.id });
  }
  function saveEdit() {
    if (!active || !editDraft) return;
    const result = receiptSchema.safeParse(editDraft);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues)
        next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      requestAnimationFrame(() =>
        document.getElementById(`scan-${Object.keys(next)[0]}`)?.focus(),
      );
      return;
    }
    session.updateExpense(active.id, result.data);
    setAnnouncement("Pengeluaran diperbarui.");
    back();
  }
  function removeExpense() {
    if (!active) return;
    setDeleted(active);
    session.removeExpense(active.id);
    setAnnouncement("");
    close();
    requestAnimationFrame(() => undo.current?.focus({ preventScroll: true }));
  }
  function restoreExpense() {
    if (!deleted) return;
    const id = deleted.id;
    session.restoreExpense(deleted);
    setDeleted(null);
    setAnnouncement("Pengeluaran dikembalikan.");
    requestAnimationFrame(() =>
      (
        search.current
          ?.closest(".activity-page")
          ?.querySelector<HTMLElement>(
            `[data-modal-focus-key="expense:${CSS.escape(id)}"]`,
          ) ?? search.current
      )?.focus({ preventScroll: true }),
    );
  }
  function openUpcoming(label: string) {
    open(
      label === "Profil" ? { kind: "profile" } : { kind: "upcoming", label },
    );
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Langsung ke konten
      </a>
      <AppNavigation
        activePage="activity"
        onAdd={() => open({ kind: "add" })}
        onUpcoming={openUpcoming}
      />
      <div className="app-shell activity-page">
        <header className="activity-header">
          <div className="activity-header-inner">
            <span className="activity-header-icon">
              <ReceiptText size={21} />
            </span>
            <div>
              <h1>Aktivitas Keuangan</h1>
              <p>Timeline pengeluaran & catatan harian</p>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main id="main-content" className="activity-main">
          {!online && (
            <p className="offline-banner" role="status">
              <WifiOff size={18} />
              Kamu sedang offline. Periksa koneksi internetmu.
            </p>
          )}
          {deleted && (
            <div className="activity-undo" role="status">
              <span>Pengeluaran dihapus.</span>
              <Button variant="ghost" ref={undo} onClick={restoreExpense}>
                <Undo2 size={15} />
                Urungkan
              </Button>
            </div>
          )}
          {announcement && !deleted && (
            <p className="activity-feedback" role="status">
              <CheckCircle2 size={16} />
              {announcement}
            </p>
          )}
          <section
            className="activity-summary"
            aria-label="Ringkasan aktivitas"
          >
            <div className="activity-period-row">
              <div>
                <span>Periode terpilih</span>
                <Button
                  variant="ghost"
                  onClick={() => open({ kind: "period" })}
                  aria-label="Ubah periode aktivitas"
                >
                  {activityPeriodLabel(period)}
                  <ChevronDown size={16} />
                </Button>
              </div>
              <span className="activity-count">
                <i aria-hidden="true" />
                {snapshot.count} transaksi
              </span>
            </div>
            <p className="activity-total-label">
              {query.trim() || countFilters || view === "day"
                ? "Total pengeluaran ditampilkan"
                : "Total pengeluaran periode ini"}
            </p>
            <div className="activity-total-row">
              <MoneyDisplay amountIdr={snapshot.totalIdr} />
              {snapshot.dominant && (
                <span
                  className={`activity-dominant tone-${snapshot.dominant.tone}`}
                >
                  <CategoryIcon category={snapshot.dominant} />
                  {snapshot.dominant.label} {snapshot.dominant.percent}%
                </span>
              )}
            </div>
            <div className="activity-insight">
              <Image
                src="/mascot/mochi-crown-transparent.webp"
                alt=""
                width={32}
                height={32}
              />
              <p>
                {snapshot.count ? (
                  <>
                    {snapshot.count} pengeluaran tercatat di{" "}
                    <strong>{snapshot.days} hari</strong>. Satu langkah kecil
                    untuk mengenal kebiasaanmu.
                  </>
                ) : (
                  "Belum ada pengeluaran untuk pilihan ini. Kamu bisa mencoba periode atau filter lain."
                )}
              </p>
              <Sparkles size={16} aria-hidden="true" />
            </div>
          </section>
          <div
            className="activity-views"
            role="tablist"
            aria-label="Tampilan aktivitas"
          >
            {views.map((tab, index) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                id={`activity-tab-${tab.value}`}
                aria-selected={view === tab.value}
                tabIndex={view === tab.value ? 0 : -1}
                aria-controls="activity-timeline"
                onClick={() => setView(tab.value)}
                onKeyDown={(event) => {
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % views.length
                      : event.key === "ArrowLeft"
                        ? (index + views.length - 1) % views.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? views.length - 1
                            : -1;
                  if (next >= 0) {
                    event.preventDefault();
                    setView(views[next].value);
                    document
                      .getElementById(`activity-tab-${views[next].value}`)
                      ?.focus();
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="activity-search-bar">
            <div className="activity-search">
              <Search size={18} aria-hidden="true" />
              <Input
                ref={search}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={100}
                aria-label="Cari merchant, kategori, atau tag"
                placeholder="Cari merchant, kategori, tag"
              />
              {query && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Bersihkan pencarian"
                  onClick={() => {
                    setQuery("");
                    search.current?.focus();
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              onClick={openFilters}
              aria-label="Filter aktivitas"
            >
              <SlidersHorizontal size={18} />
              Filter
              {countFilters > 0 && (
                <span className="activity-filter-count">{countFilters}</span>
              )}
            </Button>
          </div>
          <div
            className="activity-categories"
            role="group"
            aria-label="Kategori pengeluaran"
          >
            <button
              type="button"
              aria-pressed={filters.category === "all"}
              onClick={() => setFilters({ ...filters, category: "all" })}
            >
              Semua <span>{snapshot.baseCount}</span>
            </button>
            {snapshot.categories.map((category) => (
              <button
                key={category.code}
                type="button"
                aria-pressed={filters.category === category.code}
                onClick={() =>
                  setFilters({ ...filters, category: category.code })
                }
              >
                <CategoryIcon category={category} />
                {category.label}
                <span>{category.count}</span>
              </button>
            ))}
          </div>
          {view === "day" && (
            <div className="activity-day-nav">
              <button
                type="button"
                className="icon-button"
                aria-label="Hari sebelumnya"
                disabled={day <= bounds.start}
                onClick={() => setFocusedDay(addDays(day, -1))}
              >
                <ChevronLeft size={18} />
              </button>
              <Button variant="ghost" onClick={() => open({ kind: "day" })}>
                <CalendarDays size={16} />
                {formatDate(`${day}T12:00:00+07:00`, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Button>
              <button
                type="button"
                className="icon-button"
                aria-label="Hari berikutnya"
                disabled={day >= bounds.end}
                onClick={() => setFocusedDay(addDays(day, 1))}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
          <div
            id="activity-timeline"
            role="tabpanel"
            aria-labelledby={`activity-tab-${view}`}
            className="activity-timeline"
          >
            {snapshot.groups.map((group, index) => (
              <section
                key={group.key}
                className={`activity-group ${index === 0 ? "is-first" : ""}`}
                aria-label={activityGroupLabel(group.key, view, today)}
              >
                <div className="activity-group-heading">
                  <span className="activity-timeline-dot" aria-hidden="true" />
                  <h2>{activityGroupLabel(group.key, view, today)}</h2>
                  <MoneyDisplay amountIdr={group.totalIdr} expense />
                </div>
                <div className="activity-group-rows">
                  {group.expenses.map((expense) => (
                    <TransactionRow
                      key={expense.id}
                      expense={expense}
                      category={homeFixture.categories.find(
                        (category) => category.code === expense.categoryCode,
                      )!}
                      variant="timeline"
                      source={expense.source}
                      tags={expense.tags}
                      onSelect={() => open({ kind: "detail", id: expense.id })}
                    />
                  ))}
                </div>
              </section>
            ))}
            {!snapshot.count && (
              <section className="activity-empty">
                <span>
                  <SearchX size={28} />
                </span>
                <h2>
                  {snapshot.periodCount
                    ? "Belum ada hasil yang cocok"
                    : "Belum ada pengeluaran di periode ini"}
                </h2>
                <p>
                  {snapshot.periodCount
                    ? "Coba kata kunci lain, ubah tanggal harian, atau atur ulang filtermu."
                    : "Pilih periode lain atau mulai catatan pengeluaranmu."}
                </p>
                <Button
                  variant="secondary"
                  onClick={
                    snapshot.periodCount
                      ? resetFilters
                      : () => open({ kind: "period" })
                  }
                >
                  {snapshot.periodCount ? "Reset filter" : "Ganti periode"}
                </Button>
              </section>
            )}
          </div>
          {snapshot.count > 0 && (
            <footer className="activity-list-footer">
              <span>
                <CheckCircle2 size={14} />
                {snapshot.count} pengeluaran ditampilkan
              </span>
              <p>Ketuk pengeluaran untuk melihat rincian.</p>
            </footer>
          )}
        </main>
      </div>
      {panel?.kind === "scan" && (
        <ScanReceiptFlow
          onBack={back}
          onClose={close}
          returnLabel="Kembali ke Aktivitas"
        />
      )}
      {panel?.kind === "chat" && (
        <ChatBatchFlow
          onBack={back}
          onClose={close}
          initialSession={session.chatSession}
          onSuspend={session.setChatSession}
          returnLabel="Kembali ke Aktivitas"
        />
      )}
      {panel?.kind === "voice" && (
        <VoiceReceiptFlow
          onBack={back}
          onClose={close}
          onChat={() => push({ kind: "chat" })}
          returnLabel="Kembali ke Aktivitas"
        />
      )}
      {panel &&
        panel.kind !== "scan" &&
        panel.kind !== "chat" &&
        panel.kind !== "voice" && (
          <Dialog
            title={title}
            onClose={close}
            onBack={canGoBack ? back : undefined}
            variant={
              panel.kind === "edit"
                ? "screen"
                : panel.kind === "add" ||
                    panel.kind === "detail" ||
                    panel.kind === "delete" ||
                    panel.kind === "install"
                  ? "sheet"
                  : "default"
            }
            className={
              panel.kind === "edit"
                ? "scan-flow activity-edit-flow"
                : panel.kind === "add"
                  ? "quick-add-dialog"
                  : panel.kind === "detail"
                    ? "expense-detail-dialog"
                    : panel.kind === "install"
                      ? "install-dialog"
                      : "activity-dialog"
            }
            description={
              panel.kind === "add"
                ? "Pilih cara input yang paling praktis untukmu"
                : undefined
            }
            footer={
              panel.kind === "filters" ? (
                <div className="activity-dialog-actions">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setFilterDraft(defaultActivityFilters);
                      setDraftPeriod(defaultPeriod);
                    }}
                  >
                    Reset pilihan
                  </Button>
                  <Button form={formId} type="submit">
                    <Check size={16} />
                    Terapkan filter
                  </Button>
                </div>
              ) : panel.kind === "detail" && active ? (
                <ExpenseDetailActions
                  onDone={close}
                  onEdit={beginEdit}
                  onDelete={() => push({ kind: "delete", id: active.id })}
                />
              ) : panel.kind === "edit" ? (
                <div className="scan-review-actions">
                  <Button type="submit" form={formId}>
                    <Check size={18} />
                    Simpan perubahan
                  </Button>
                </div>
              ) : panel.kind === "delete" ? (
                <div className="activity-dialog-actions">
                  <Button variant="secondary" onClick={back}>
                    Batal
                  </Button>
                  <Button
                    className="activity-confirm-delete"
                    onClick={removeExpense}
                  >
                    <Trash2 size={17} />
                    Hapus pengeluaran
                  </Button>
                </div>
              ) : panel.kind === "install" ? (
                <Button onClick={back}>Kembali ke Profil</Button>
              ) : undefined
            }
          >
            {panel.kind === "filters" && (
              <ActivityFilterForm
                id={formId}
                filters={filterDraft}
                period={draftPeriod}
                payments={payments}
                onChange={setFilterDraft}
                onPeriod={() => push({ kind: "period", fromFilter: true })}
                onSubmit={applyFilters}
              />
            )}
            {panel.kind === "period" && (
              <PeriodPicker
                selection={panel.fromFilter ? draftPeriod : period}
                onApply={applyPeriod}
              />
            )}
            {panel.kind === "day" && (
              <Calendar
                mode="single"
                required
                selected={calendarDate(day)}
                defaultMonth={calendarDate(day)}
                disabled={{
                  before: calendarDate(bounds.start),
                  after: calendarDate(bounds.end),
                }}
                onSelect={(date) => {
                  if (date) {
                    setFocusedDay(calendarDateKey(date));
                    close();
                  }
                }}
              />
            )}
            {panel.kind === "detail" && active && (
              <ExpenseDetail
                expense={active}
                category={homeFixture.categories.find(
                  (category) => category.code === active.categoryCode,
                )!}
                period={activityPeriodLabel(period)}
              />
            )}
            {panel.kind === "edit" && editDraft && (
              <ReceiptReview
                draft={editDraft}
                showSourcePreview={false}
                errors={errors}
                formId={formId}
                onChange={(draft) => {
                  setEditDraft(draft);
                  setErrors({});
                }}
                onSubmit={saveEdit}
                onRetake={back}
              />
            )}
            {panel.kind === "delete" && active && (
              <div className="activity-delete-confirm">
                <span className="category-icon tone-peach">
                  <Trash2 size={24} />
                </span>
                <h3>{active.merchant}</h3>
                <MoneyDisplay amountIdr={active.amountIdr} expense />
                <p>
                  Catatan ini akan dihapus dari daftar pengeluaran. Kamu bisa
                  mengurungkannya setelah dihapus.
                </p>
              </div>
            )}
            {panel.kind === "add" && (
              <QuickAddMethods
                onClose={close}
                onChoose={(label) =>
                  push({
                    kind:
                      label === "Scan struk otomatis"
                        ? "scan"
                        : label === "Voice note kilat"
                          ? "voice"
                          : "chat",
                  })
                }
              />
            )}
            {panel.kind === "profile" && (
              <ProfileOverview
                name={homeFixture.name}
                onInstall={() => push({ kind: "install" })}
              />
            )}
            {panel.kind === "install" && <InstallGuide />}
            {panel.kind === "upcoming" && (
              <FeaturePreview label={panel.label} />
            )}
          </Dialog>
        )}
    </>
  );
}
