import {
  CalendarDays,
  ChevronDown,
  CircleAlert,
  Clock3,
  CreditCard,
  FileText,
  MessageCircle,
  Pencil,
  Tag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "./money-display";
import { CategoryIcon } from "./category-icon";
import { homeFixture } from "@/mocks/fixtures/home";
import { formatDate, wibDateTime } from "@/lib/format/datetime";
import { receiptAmounts } from "@/features/scan/receipt-schema";
import { entryTitle, type ChatEntry } from "@/features/expenses/chat-batch";

export function ChatBatchList({
  entries,
  issues = {},
  onEdit,
  onRemove,
}: {
  entries: ChatEntry[];
  issues?: Record<string, string>;
  onEdit?: (entry: ChatEntry) => void;
  onRemove?: (id: string) => void;
}) {
  return (
    <ol className="chat-batch-list" aria-label="Daftar pengeluaran">
      {entries.map((entry, index) => {
        const draft = entry.draft;
        const category = homeFixture.categories.find(
          (item) => item.code === draft?.categoryCode,
        );
        const amount = draft ? receiptAmounts(draft).total : BigInt(0);
        const issue = issues[entry.id] || entry.issue;
        const occurredAt = draft
          ? wibDateTime(draft.occurredDate, draft.occurredTime)
          : "";
        const hasDate = Number.isFinite(Date.parse(occurredAt));
        return (
          <li key={entry.id} className="scan-card chat-batch-entry">
            <div className="chat-batch-entry-heading">
              {category ? (
                <CategoryIcon category={category} />
              ) : (
                <span className="chat-batch-icon">
                  <MessageCircle size={21} />
                </span>
              )}
              <div className="chat-batch-entry-copy">
                <div className="chat-batch-entry-top">
                  <span className="chat-batch-number">
                    Pengeluaran {index + 1}
                  </span>
                  {hasDate && (
                    <time className="chat-batch-clock" dateTime={occurredAt}>
                      <Clock3 size={12} aria-hidden="true" />
                      {formatDate(occurredAt, {
                        hour: "2-digit",
                        minute: "2-digit",
                        hourCycle: "h23",
                      })}{" "}
                      WIB
                    </time>
                  )}
                </div>
                <h3>{entryTitle(entry)}</h3>
                {draft ? (
                  <MoneyDisplay
                    amountIdr={(amount > BigInt(0)
                      ? amount
                      : BigInt(0)
                    ).toString()}
                  />
                ) : (
                  <span className="pill">Belum lengkap</span>
                )}
              </div>
            </div>
            {draft && (
              <div className="chat-batch-badges">
                <span className="chat-batch-badge">
                  <Tag size={14} aria-hidden="true" />
                  {category?.label ?? "Kategori belum dipilih"}
                </span>
                <span
                  className={`chat-batch-badge ${draft.paymentMethod ? "is-payment" : "is-warning"}`}
                >
                  {draft.paymentMethod ? (
                    <CreditCard size={14} aria-hidden="true" />
                  ) : (
                    <CircleAlert size={14} aria-hidden="true" />
                  )}
                  {draft.paymentMethod || "Pembayaran belum dipilih"}
                </span>
              </div>
            )}
            {draft && (
              <p className="chat-batch-meta">
                <CalendarDays size={16} aria-hidden="true" />
                <span>
                  {hasDate
                    ? `${formatDate(occurredAt, { dateStyle: "medium", timeStyle: "short" })} WIB`
                    : "Tanggal/waktu perlu dilengkapi"}
                </span>
              </p>
            )}
            <details className="chat-batch-source" open>
              <summary>
                <FileText size={14} aria-hidden="true" />
                <span>Catatan sumber</span>
                <ChevronDown
                  size={15}
                  className="chat-batch-source-chevron"
                  aria-hidden="true"
                />
              </summary>
              <p>{entry.text}</p>
            </details>
            {issue && (
              <p className="scan-field-error" role="status">
                {issue}
              </p>
            )}
            {onEdit && (
              <div className="chat-batch-entry-actions">
                <Button
                  variant="secondary"
                  aria-label={`Ubah pengeluaran ${index + 1}`}
                  onClick={() => onEdit(entry)}
                >
                  <Pencil size={17} />
                  {draft ? "Ubah rincian" : "Lengkapi"}
                </Button>
                {onRemove && (
                  <Button
                    variant="outline"
                    className="chat-batch-remove"
                    aria-label={`Hapus pengeluaran ${index + 1}`}
                    onClick={() => onRemove(entry.id)}
                  >
                    <Trash2 size={17} />
                    Hapus
                  </Button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
