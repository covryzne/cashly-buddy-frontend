import { CalendarDays, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { homeFixture } from "@/mocks/fixtures/home";
import { expenseSourceLabels } from "@/mocks/fixtures/activity";
import type { PeriodSelection } from "@/lib/format/period";
import { activityPeriodLabel, type ActivityFilters } from "./select-activity";

export function ActivityFilterForm({
  id,
  filters,
  period,
  payments,
  onChange,
  onPeriod,
  onSubmit,
}: {
  id: string;
  filters: ActivityFilters;
  period: PeriodSelection;
  payments: string[];
  onChange: (filters: ActivityFilters) => void;
  onPeriod: () => void;
  onSubmit: () => void;
}) {
  return (
    <form
      id={id}
      className="activity-filter-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Button
        variant="outline"
        onClick={onPeriod}
        data-modal-focus-key="filter-period"
      >
        <CalendarDays size={18} />
        <span>
          <small>Periode</small>
          <strong>{activityPeriodLabel(period)}</strong>
        </span>
        <ChevronRight size={17} />
      </Button>
      <div className="activity-filter-field">
        <label htmlFor={`${id}-category`}>Kategori</label>
        <select
          id={`${id}-category`}
          className="input"
          value={filters.category}
          onChange={(event) =>
            onChange({ ...filters, category: event.target.value })
          }
        >
          <option value="all">Semua kategori</option>
          {homeFixture.categories.map((category) => (
            <option key={category.code} value={category.code}>
              {category.label}
            </option>
          ))}
        </select>
      </div>
      <div className="activity-filter-field">
        <label htmlFor={`${id}-source`}>Sumber catatan</label>
        <select
          id={`${id}-source`}
          className="input"
          value={filters.source}
          onChange={(event) =>
            onChange({ ...filters, source: event.target.value })
          }
        >
          <option value="all">Semua sumber</option>
          {Object.entries(expenseSourceLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="activity-filter-field">
        <label htmlFor={`${id}-payment`}>Pembayaran</label>
        <select
          id={`${id}-payment`}
          className="input"
          value={filters.payment}
          onChange={(event) =>
            onChange({ ...filters, payment: event.target.value })
          }
        >
          <option value="all">Semua pembayaran</option>
          {payments.map((payment) => (
            <option key={payment} value={payment}>
              {payment || "Belum dipilih"}
            </option>
          ))}
        </select>
      </div>
      <div className="activity-filter-field">
        <label htmlFor={`${id}-order`}>Urutan</label>
        <select
          id={`${id}-order`}
          className="input"
          value={filters.order}
          onChange={(event) =>
            onChange({
              ...filters,
              order: event.target.value as ActivityFilters["order"],
            })
          }
        >
          <option value="newest">Terbaru dahulu</option>
          <option value="oldest">Terlama dahulu</option>
        </select>
      </div>
    </form>
  );
}
