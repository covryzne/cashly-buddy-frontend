import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "./money-display";

export function ExpenseSummaryCard({
  totalIdr,
  period,
  count,
  onAdd,
  onPeriod,
  isCurrentMonth = true,
}: {
  totalIdr: string;
  period: string;
  count: number;
  onAdd: () => void;
  onPeriod: () => void;
  isCurrentMonth?: boolean;
}) {
  return (
    <section className="card expense-summary" aria-labelledby="summary-title" data-wide-amount={totalIdr.length > 10 || undefined}>
      <div className="section-heading">
        <h2 id="summary-title" className="eyebrow">
          {isCurrentMonth ? "Pengeluaran bulan ini" : "Pengeluaran periode ini"}
        </h2>
        <button
          type="button"
          className="period-trigger"
          onClick={onPeriod}
          aria-label="Pilih periode pengeluaran"
          aria-haspopup="dialog"
          aria-describedby="summary-period"
          title={period}
        >
          <span id="summary-period">{period}</span>
          <ChevronDown size={15} aria-hidden="true" />
        </button>
      </div>
      <MoneyDisplay amountIdr={totalIdr} className="hero-amount" />
      <div className="summary-meta">
        <span>{count} transaksi</span>
        <Button onClick={onAdd} aria-label="Catat pengeluaran">
          <Plus size={17} aria-hidden="true" />
          Catat
        </Button>
      </div>
    </section>
  );
}
