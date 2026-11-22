'use client';

import { useHomeData } from './use-home-data';
import { useServerSummary } from '@/features/reports/use-server-summary';
import { LocalDataStatus } from '@/components/shared/local-data-status';

import { Suspense, useState, useSyncExternalStore } from 'react';
import { Sparkles, Hand, ArrowUpRight, Plus } from 'lucide-react';
import { type Category, type Expense } from '@/mocks/fixtures/home';
import { formatDate } from '@/lib/format/datetime';
import { MoneyDisplay } from '@/components/finance/money-display';
import { CategoryIcon } from '@/components/finance/category-icon';
import { TransactionRow } from '@/components/finance/transaction-row';
import { CategoryDetail } from '@/components/finance/category-detail';
import {
  defaultCategoryDetailFilters,
  type CategoryDetailFilters,
} from '@/features/expenses/select-category-detail';
import { ExpenseSummaryCard } from '@/components/finance/expense-summary-card';
import { MochiTools } from './mochi-tools';
import { StreakCard } from '@/components/gamification/streak-card';
import { MissionBoard } from '@/components/gamification/mission-board';
import { MissionCard } from '@/components/gamification/mission-card';
import { MascotStageRenderer } from '@/components/gamification/mascot-stage-renderer';
import { AppNavigation } from '@/components/shared/app-navigation';
import { NotificationButton } from '@/features/notifications/notification-button';
import { NotificationCaptureEntry } from '@/features/notifications/notification-capture-entry';
import { PeriodPicker } from '@/components/finance/period-picker';
import { QuickAddMethods } from '@/components/finance/quick-add-methods';
import { monthKey, selectPeriod } from './select-month';
import type { PeriodSelection } from '@/lib/format/period';
import { useModalStack } from '@/components/shared/use-modal-stack';
import {
  ExpenseDetail,
  ExpenseDetailActions,
} from '@/components/finance/expense-detail';
import { FeaturePreview } from '@/components/shared/feature-preview';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InstallGuide } from '@/components/shared/install-app';
import { ProfileOverview } from '@/components/shared/profile-overview';
import { ScanReceiptFlow } from '@/features/scan/scan-receipt-flow';
import { ChatBatchFlow } from '@/features/expenses/chat-batch-flow';
import { VoiceReceiptFlow } from '@/features/expenses/voice-receipt-flow';
import { useExpenseSession } from '@/features/expenses/expense-session';
import { useProfileSession } from '@/features/profile/profile-session';

const subscribeClock = (notify: () => void) => {
  window.addEventListener('focus', notify);
  return () => window.removeEventListener('focus', notify);
};

type Panel =
  | { kind: 'profile' }
  | { kind: 'install' }
  | { kind: 'add' }
  | { kind: 'scan' }
  | { kind: 'chat' }
  | { kind: 'voice' }
  | { kind: 'period' }
  | { kind: 'upcoming'; label: string }
  | { kind: 'category'; category: Category }
  | { kind: 'expense'; expense: Expense }
  | { kind: 'transactions' }
  | { kind: 'missions' };
export function HomeDashboard() {
  const data = useHomeData();
  const session = useExpenseSession();
  const { profile } = useProfileSession();
  const { expenses, chatSession, setChatSession } = useExpenseSession();
  const currentMonth = useSyncExternalStore(
    subscribeClock,
    () => monthKey(),
    () => monthKey(data.asOf),
  );
  const [periodOverride, setPeriodOverride] = useState<PeriodSelection | null>(
    null,
  );
  const selection: PeriodSelection = periodOverride ?? {
    kind: 'month',
    month: currentMonth,
  };
  const summary = useServerSummary(selection);
  const computed = selectPeriod(selection, expenses);
  const snapshot = {
    ...computed,
    totalIdr: summary?.data?.amount_idr ?? computed.totalIdr,
    count: summary?.data?.count ?? computed.count,
  };
  const {
    panel,
    open: setPanel,
    push,
    back,
    close,
    canGoBack,
  } = useModalStack<Panel>();
  const [greeting, setGreeting] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState<CategoryDetailFilters>(
    defaultCategoryDetailFilters,
  );
  const upcoming = (label: string) =>
    setPanel(
      label === 'Profil' ? { kind: 'profile' } : { kind: 'upcoming', label },
    );
  const selectedExpenses =
    panel?.kind === 'category'
      ? snapshot.expenses.filter(
          (expense) => expense.categoryCode === panel.category.code,
        )
      : snapshot.expenses;
  const panelTitle =
    panel?.kind === 'add'
      ? 'Catat pengeluaran baru'
      : panel?.kind === 'profile'
        ? 'Profil'
        : panel?.kind === 'install'
          ? 'Download Cashly'
          : panel?.kind === 'period'
            ? 'Pilih periode pengeluaran'
            : panel?.kind === 'upcoming'
              ? panel.label
              : panel?.kind === 'category'
                ? panel.category.label
                : panel?.kind === 'expense'
                  ? 'Detail pengeluaran'
                  : panel?.kind === 'missions'
                    ? 'Misi kamu'
                    : 'Transaksi periode ini';
  return (
    <>
      <Suspense fallback={null}>
        <NotificationCaptureEntry onOpen={() => setPanel({ kind: 'add' })} />
      </Suspense>
      <a href="#main-content" className="skip-link">
        Langsung ke konten
      </a>
      <AppNavigation
        onAdd={() => setPanel({ kind: 'add' })}
        onUpcoming={upcoming}
      />
      <div className="app-shell">
        <div className="home-notification-control">
          <NotificationButton />
        </div>
        <main id="main-content" className="dashboard">
          <LocalDataStatus />
          <div className="greeting-row">
            <div>
              <h1>
                Hi, {profile.name}! <span aria-hidden="true">👋</span>
              </h1>
              <p className="muted greeting-date">
                {formatDate(data.asOf, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          {summary?.error && <p role="alert">{summary.error}</p>}
          <div className="home-grid">
            <div className="summary-area">
              <ExpenseSummaryCard
                onPeriod={() => setPanel({ kind: 'period' })}
                isCurrentMonth={
                  selection.kind === 'month' && selection.month === currentMonth
                }
                totalIdr={snapshot.totalIdr}
                period={snapshot.period}
                count={snapshot.count}
                onAdd={() => setPanel({ kind: 'add' })}
              />
              <MochiTools />
            </div>
            <section
              className="companion-area companion-card"
              aria-labelledby="companion-title"
            >
              <h2 id="companion-title" className="pill companion-title">
                Mochi & pengeluaranmu <Sparkles size={14} />
              </h2>
              <div className="mascot-stage">
                <div className="mascot-center">
                  <MascotStageRenderer
                    stage={data.mascotStage}
                    onGreeting={() => setGreeting(true)}
                  />
                  <span className="mascot-label">
                    <Sparkles size={13} />
                    {data.mascotStage
                      ? `Level ${data.mascotStage}`
                      : 'Pendamping awal'}
                  </span>
                </div>
                {snapshot.categories.slice(0, 4).map((category, index) => (
                  <button
                    key={category.code}
                    className={`floating-category float-${index}`}
                    onClick={() => {
                      setCategoryFilters(defaultCategoryDetailFilters);
                      setPanel({ kind: 'category', category });
                    }}
                  >
                    <CategoryIcon category={category} />
                    <span>
                      <small>{category.label}</small>
                      <MoneyDisplay amountIdr={category.amountIdr} />
                    </span>
                  </button>
                ))}
              </div>
              <p className="mascot-level-copy">
                Mochi kamu masih level {data.mascotStage} nih
              </p>
              <p className="companion-hint" aria-live="polite">
                {greeting && profile.friendlyGreeting ? (
                  `Hai, ${profile.name}! Senang menemanimu hari ini.`
                ) : (
                  <>
                    <Hand size={14} />
                    Tap kartu untuk melihat rincian pengeluaran
                  </>
                )}
              </p>
              <p className="caption mascot-disclaimer">
                Bertumbuh mengikuti streak berjalan.
              </p>
            </section>
            <div className="streak-area">
              <StreakCard
                streak={data.streak}
                freezeBalance={data.freezeBalance}
                calendar={data.calendar}
                todayCheckedIn={
                  session.remoteMode
                    ? (session.game?.today_checked_in ?? false)
                    : true
                }
                todayDate={session.game?.today_local_date}
                recovery={
                  session.game?.recovery
                    ? {
                        dates: session.game.recovery.protected_local_dates,
                        required: session.game.recovery.required,
                        canRestore: session.game.recovery.can_restore,
                        result: session.game.recovery.streak_after_recovery,
                      }
                    : undefined
                }
                onUseFreeze={
                  session.game?.recovery
                    ? () =>
                        session.gameAction(
                          'freeze',
                          session.game!.recovery!.protected_local_dates,
                        )
                    : undefined
                }
                pending={session.mutationPending}
                onCheckIn={
                  session.remoteMode && session.game
                    ? () => void session.gameAction('review')
                    : undefined
                }
                onNoSpend={
                  session.remoteMode &&
                  session.game &&
                  !session.expenses.some(
                    (e) =>
                      new Intl.DateTimeFormat('en-CA', {
                        timeZone: session.game?.timezone ?? 'Asia/Jakarta',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      }).format(new Date(e.occurredAt)) ===
                      session.game?.today_local_date,
                  )
                    ? () => void session.gameAction('no-spend')
                    : undefined
                }
              />
            </div>
            {!session.remoteMode && (
              <section className="missions-area">
                <div className="section-heading section-title">
                  <h2>
                    Misi hari ini <span className="count-badge">1/1</span>
                  </h2>
                  <button
                    className="text-button"
                    onClick={() => setPanel({ kind: 'missions' })}
                  >
                    Lihat semua <ArrowUpRight size={14} />
                  </button>
                </div>
                <div className="mission-list">
                  <MissionCard
                    title="Catat pengeluaran hari ini"
                    completed
                    onSelect={() => setPanel({ kind: 'missions' })}
                  />
                </div>
              </section>
            )}
            <section className="transactions-area">
              <div className="section-heading section-title">
                <h2>Transaksi terbaru</h2>
                <button
                  className="text-button"
                  onClick={() => setPanel({ kind: 'transactions' })}
                >
                  Lihat semua <ArrowUpRight size={14} />
                </button>
              </div>
              <div className="card transaction-list">
                {snapshot.expenses.length === 0 && (
                  <div className="empty-expenses">
                    <p>Belum ada pengeluaran di periode ini.</p>
                    <small>Pilih periode lain untuk melihat catatanmu.</small>
                  </div>
                )}
                {snapshot.expenses.slice(0, 3).map((expense) => (
                  <TransactionRow
                    key={expense.id}
                    expense={expense}
                    category={
                      data.categories.find(
                        (category) => category.code === expense.categoryCode,
                      )!
                    }
                    onSelect={() => setPanel({ kind: 'expense', expense })}
                  />
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
      {panel?.kind === 'scan' && (
        <ScanReceiptFlow onBack={back} onClose={close} />
      )}
      {panel?.kind === 'chat' && (
        <ChatBatchFlow
          onBack={back}
          onClose={close}
          initialSession={chatSession}
          onSuspend={setChatSession}
        />
      )}
      {panel?.kind === 'voice' && (
        <VoiceReceiptFlow onBack={back} onClose={close} />
      )}
      {panel &&
        panel.kind !== 'scan' &&
        panel.kind !== 'chat' &&
        panel.kind !== 'voice' && (
          <Dialog
            title={panelTitle}
            onClose={close}
            onBack={canGoBack ? back : undefined}
            variant={
              panel.kind === 'add' ||
              panel.kind === 'category' ||
              panel.kind === 'expense' ||
              panel.kind === 'install'
                ? 'sheet'
                : 'default'
            }
            className={
              panel.kind === 'category'
                ? 'category-detail-dialog'
                : panel.kind === 'expense'
                  ? 'expense-detail-dialog'
                  : panel.kind === 'install'
                    ? 'install-dialog'
                    : panel.kind === 'add'
                      ? 'quick-add-dialog'
                      : undefined
            }
            headerActions={
              panel.kind === 'category' ? (
                <span className="category-header-count">
                  {selectedExpenses.length} transaksi
                </span>
              ) : undefined
            }
            footer={
              panel.kind === 'category' ? (
                <Button
                  data-modal-focus-key="category-add"
                  onClick={() => push({ kind: 'add' })}
                >
                  <Plus size={17} />
                  Catat pengeluaran
                </Button>
              ) : panel.kind === 'install' ? (
                <Button onClick={back}>Kembali ke Profil</Button>
              ) : panel.kind === 'expense' ? (
                <ExpenseDetailActions onDone={close} />
              ) : undefined
            }
            description={
              panel.kind === 'add'
                ? 'Pilih cara input yang paling praktis untukmu'
                : undefined
            }
          >
            {panel.kind !== 'add' &&
              panel.kind !== 'category' &&
              panel.kind !== 'expense' &&
              panel.kind !== 'profile' &&
              panel.kind !== 'install' && (
                <span className="pill dialog-demo">
                  {panel.kind === 'missions' ? data.period : snapshot.period}
                </span>
              )}
            {panel.kind === 'add' && (
              <QuickAddMethods
                onClose={close}
                onChoose={(label) =>
                  push(
                    label === 'Scan struk otomatis'
                      ? { kind: 'scan' }
                      : label === 'Chat manual'
                        ? { kind: 'chat' }
                        : label === 'Voice note kilat'
                          ? { kind: 'voice' }
                          : { kind: 'upcoming', label },
                  )
                }
              />
            )}
            {panel.kind === 'period' && (
              <PeriodPicker
                selection={selection}
                onApply={(value) => {
                  setPeriodOverride(value);
                  close();
                }}
              />
            )}
            {panel.kind === 'upcoming' && (
              <FeaturePreview label={panel.label} />
            )}
            {panel.kind === 'profile' && (
              <ProfileOverview
                name={profile.name}
                onInstall={() => push({ kind: 'install' })}
              />
            )}
            {panel.kind === 'install' && <InstallGuide />}
            {panel.kind === 'category' && (
              <CategoryDetail
                category={panel.category}
                expenses={expenses}
                period={selection}
                filters={categoryFilters}
                onFiltersChange={setCategoryFilters}
                onSelect={(expense) => push({ kind: 'expense', expense })}
              />
            )}
            {panel.kind === 'transactions' && (
              <>
                <div className="transaction-list">
                  {selectedExpenses.length === 0 && (
                    <p className="empty-expenses">
                      Belum ada transaksi pada periode ini.
                    </p>
                  )}
                  {selectedExpenses.map((expense) => (
                    <TransactionRow
                      key={expense.id}
                      expense={expense}
                      category={
                        data.categories.find(
                          (category) => category.code === expense.categoryCode,
                        )!
                      }
                      onSelect={() => push({ kind: 'expense', expense })}
                    />
                  ))}
                </div>
              </>
            )}

            {panel.kind === 'expense' && (
              <ExpenseDetail
                expense={panel.expense}
                period={snapshot.period}
                category={
                  data.categories.find(
                    (category) => category.code === panel.expense.categoryCode,
                  )!
                }
              />
            )}
            {panel.kind === 'missions' && !session.remoteMode && (
              <MissionBoard />
            )}
          </Dialog>
        )}
    </>
  );
}
