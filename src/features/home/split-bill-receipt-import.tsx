import { useState } from "react";
import { Check, ReceiptText, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanReceiptFlow } from "@/features/scan/scan-receipt-flow";
import { receiptAmounts, type ReceiptDraft } from "@/features/scan/receipt-schema";
import { formatMoney } from "@/lib/format/money";
import { useOnline } from "@/lib/pwa/connectivity";
import styles from "./mochi-tools.module.css";

const lineTotal = (item: ReceiptDraft["items"][number]) => Number(item.quantity) * Number(item.priceIdr);
const canImport = (draft: ReceiptDraft) => draft.items.every((item) => lineTotal(item) <= 999_999_999_999);

export function SplitBillReceiptImport({ onImport, replacesDraft }: {
  onImport: (draft: ReceiptDraft) => void;
  replacesDraft: boolean;
}) {
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <section className={styles.receiptImport} aria-label="Impor menu dari struk">
      <h3><ScanLine size={18} aria-hidden /> Scan struk</h3>
      <p>Isi daftar menu dari foto struk atau gambar di galeri.</p>
      {!online && <p role="status">Hubungkan internet untuk scan struk. Kamu tetap bisa isi menu manual.</p>}
      <Button type="button" variant="outline" disabled={!online} onClick={() => setOpen(true)}>
        <ScanLine size={16} aria-hidden /> Buka scan struk
      </Button>
      {open && (
        <ScanReceiptFlow
          onBack={close}
          onClose={close}
          renderReview={(draft) => {
            const { subtotal, tax, discount, total } = receiptAmounts(draft);
            return (
              <div className={styles.receiptReview}>
                <section className={styles.receiptCard} aria-label="Rincian struk">
                  <header className={styles.receiptHeader}>
                    <span><ReceiptText size={21} aria-hidden /></span>
                    <div>
                      <h3>Menu yang terbaca</h3>
                      <p>{draft.merchant ? `${draft.merchant} · ` : ""}{draft.items.length} baris menu</p>
                    </div>
                  </header>
                  <ul className={styles.receiptItems}>
                  {draft.items.map((item, index) => (
                    <li key={index}>
                      <span>{item.name} <small>× {item.quantity}</small></span>
                      <strong>{formatMoney(String(lineTotal(item)))}</strong>
                    </li>
                  ))}
                  </ul>
                  <dl className={styles.receiptTotals}>
                    <div><dt>Subtotal</dt><dd>{formatMoney(String(subtotal))}</dd></div>
                    {tax > BigInt(0) && <div><dt>Pajak</dt><dd>{formatMoney(String(tax))}</dd></div>}
                    {discount > BigInt(0) && <div><dt>Diskon</dt><dd>−{formatMoney(String(discount))}</dd></div>}
                    <div className={styles.receiptTotal}><dt>Total terbaca</dt><dd>{formatMoney(String(total))}</dd></div>
                  </dl>
                </section>
                <p className={styles.receiptNote}>{replacesDraft ? "Pakai hasil scan akan mengganti menu, pajak, dan diskon yang sudah diisi. " : ""}Kamu bisa koreksi hasilnya setelah masuk ke daftar menu.</p>
                {!canImport(draft) && <p className="scan-form-alert" role="alert">Ada nominal menu yang melebihi batas. Masukkan menu secara manual.</p>}
              </div>
            );
          }}
          renderReviewActions={(draft) => (
            <div className={styles.receiptFooter}>
              <Button type="button" disabled={!canImport(draft)} onClick={() => { onImport(draft); close(); }}>
                <Check size={17} aria-hidden /> Pakai hasil scan
              </Button>
              <Button type="button" variant="outline" onClick={close}>Batal</Button>
            </div>
          )}
        />
      )}
    </section>
  );
}
