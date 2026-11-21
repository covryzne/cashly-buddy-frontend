import {
  reportTransactionGroups,
  type ReportSnapshot,
} from "@/features/reports/select-reports";
import { formatDate } from "@/lib/format/datetime";
import { MoneyDisplay } from "./money-display";

export function ReportPrintDetails({
  snapshot,
  periodLabel,
  timezone = "Asia/Jakarta",
  timezoneLabel = "WIB",
}: {
  snapshot: ReportSnapshot;
  periodLabel: string;
  timezone?: string;
  timezoneLabel?: string;
}) {
  const groups = reportTransactionGroups(snapshot);
  return (
    <section
      className="report-print-details"
      aria-label="Rincian transaksi per kategori"
    >
      <header className="report-print-heading">
        <p>Cashly · Laporan pengeluaran</p>
        <h2>Rincian transaksi per kategori</h2>
        <p>
          {periodLabel} · {snapshot.count} transaksi · Zona waktu {timezoneLabel}
        </p>
      </header>
      {groups.length ? (
        groups.map(({ category, expenses }) => (
          <section
            key={category.code}
            className="report-print-category"
            aria-label={`Rincian ${category.label}`}
          >
            <table>
              <caption>
                <strong>{category.label}</strong>
                <span>
                  {category.count} transaksi · {category.percent}% dari total
                </span>
              </caption>
              <colgroup>
                <col className="report-print-date-column" />
                <col />
                <col className="report-print-payment-column" />
                <col className="report-print-amount-column" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Tanggal & jam ({timezoneLabel})</th>
                  <th scope="col">Merchant / deskripsi</th>
                  <th scope="col">Pembayaran</th>
                  <th scope="col">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <time dateTime={expense.occurredAt}>
                        {formatDate(expense.occurredAt, {
                          dateStyle: "medium",
                          timeZone: timezone,
                        })}
                        <small>
                          {formatDate(expense.occurredAt, {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: timezone,
                          })}{" "}
                          {timezoneLabel}
                        </small>
                      </time>
                    </td>
                    <td>
                      <strong>{expense.merchant || "Tanpa merchant"}</strong>
                      {expense.description && (
                        <small>{expense.description}</small>
                      )}
                    </td>
                    <td>{expense.paymentMethod || "Belum dipilih"}</td>
                    <td>
                      <MoneyDisplay amountIdr={expense.amountIdr} />
                    </td>
                  </tr>
                ))}
                <tr className="report-print-subtotal">
                  <th scope="row" colSpan={3}>
                    Subtotal {category.label}
                  </th>
                  <td>
                    <MoneyDisplay amountIdr={category.amountIdr} />
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        ))
      ) : (
        <p>Belum ada transaksi pada periode ini.</p>
      )}
      <div className="report-print-total">
        <strong>Total seluruh pengeluaran · {snapshot.count} transaksi</strong>
        <MoneyDisplay amountIdr={snapshot.totalIdr} />
      </div>
    </section>
  );
}
