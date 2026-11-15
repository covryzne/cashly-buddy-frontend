import Image from "next/image";
import { useOnline } from "@/lib/pwa/connectivity";
import {
  CalendarDays,
  Check,
  CreditCard,
  NotebookText,
  PencilLine,
  QrCode,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import type { Category, Expense } from "@/mocks/fixtures/home";
import { formatDate } from "@/lib/format/datetime";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "./category-icon";
import { MoneyDisplay } from "./money-display";

export function ExpenseDetail({
  expense,
  category,
  period,
}: {
  expense: Expense;
  category: Category;
  period: string;
}) {
  return (
    <div className="expense-detail-view">
      <div className="receipt-context">
        <span className="pill dialog-demo">
          <Sparkles size={12} />
          {period}
        </span>
        <span className="receipt-status">
          <ShieldCheck size={13} />
          Tercatat
        </span>
      </div>
      <article className="expense-receipt">
        <header className="receipt-merchant">
          <CategoryIcon category={category} />
          <div>
            <span className="receipt-eyebrow">Pengeluaran</span>
            <h3>{expense.merchant}</h3>
          </div>
        </header>
        <div className="receipt-amount">
          <MoneyDisplay
            amountIdr={expense.amountIdr}
            expense
            className="detail-amount"
          />
          <span className="receipt-currency">IDR</span>
        </div>
        <p className="receipt-description">{expense.description}</p>
        <aside className="receipt-encouragement">
          <span className="receipt-sparkle">
            <Sparkles size={20} />
          </span>
          <div>
            <strong>Setiap catatan berarti.</strong>
            <small>Check-in dihitung sekali sehari.</small>
          </div>
          <Image
            className="receipt-buddy"
            src="/mascot/mochi-crown-transparent.webp"
            alt="Mochi"
            width={48}
            height={48}
          />
        </aside>
        <div className="receipt-meta-panel">
          <dl className="receipt-metadata">
            <div>
              <dt>
                <Tag size={17} />
                Kategori
              </dt>
              <dd>
                <span className="receipt-category">{category.label}</span>
              </dd>
            </div>
            <div>
              <dt>
                <CreditCard size={17} />
                Pembayaran
              </dt>
              <dd>
                <span className="receipt-payment">
                  {expense.paymentMethod === "QRIS" && <QrCode size={13} />}
                  {expense.paymentMethod}
                </span>
              </dd>
            </div>
            <div>
              <dt>
                <CalendarDays size={17} />
                Waktu (WIB)
              </dt>
              <dd>
                <time dateTime={expense.occurredAt}>
                  {formatDate(expense.occurredAt, { dateStyle: "medium" })}
                  <small>
                    {formatDate(expense.occurredAt, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    WIB
                  </small>
                </time>
              </dd>
            </div>
          </dl>
          <section className="receipt-note" aria-label="Catatan transaksi">
            <h4>
              <NotebookText size={17} />
              Catatan
            </h4>
            <p>Belum ada catatan tambahan.</p>
          </section>
        </div>
      </article>
    </div>
  );
}

export function ExpenseDetailActions({
  onDone,
  onEdit,
  onDelete,
}: {
  onDone: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const online = useOnline();
  return (
    <div
      className={`receipt-actions ${onDelete ? "receipt-actions-editable" : ""}`}
    >
      <Button
        disabled={!onEdit || !online}
        onClick={onEdit}
        title={!online ? "Perlu koneksi internet" : onEdit ? undefined : "Pengeditan belum tersedia"}
        data-modal-focus-key="edit-expense"
      >
        <PencilLine size={18} />
        Ubah detail
      </Button>
      {onDelete && (
        <Button
          variant="outline"
          disabled={!online}
          onClick={onDelete}
          className="activity-delete-button"
          data-modal-focus-key="delete-expense"
        >
          <Trash2 size={17} />
          Hapus
        </Button>
      )}
      <button
        className="icon-button receipt-done"
        aria-label="Selesai melihat detail"
        onClick={onDone}
      >
        <Check size={21} />
      </button>
    </div>
  );
}
