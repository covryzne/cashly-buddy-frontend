"use client";

import { Info } from "lucide-react";
import { MoneyDisplay } from "./money-display";
import { rangeLabel } from "@/lib/format/period";
import { formatMoney } from "@/lib/format/money";
type Point = {
  start: string;
  end: string;
  label: string;
  totalIdr: string;
  count: number;
};
export function SpendingTrendChart({
  points,
  selectedStart,
  onSelect,
}: {
  points: Point[];
  selectedStart: string | null;
  onSelect: (start: string) => void;
}) {
  const maximum = points.reduce(
    (max, point) =>
      BigInt(point.totalIdr) > max ? BigInt(point.totalIdr) : max,
    BigInt(0),
  );
  const selected = points.find((point) => point.start === selectedStart);
  return (
    <div className="spending-trend-chart">
      <div
        className="report-trend-bars"
        role="group"
        aria-label="Pilih interval tren"
      >
        {points.map((point) => (
          <button
            type="button"
            key={point.start}
            aria-pressed={point.start === selectedStart}
            aria-label={`${rangeLabel(point.start, point.end)}, ${formatMoney(point.totalIdr)}, ${point.count} transaksi`}
            onClick={() => onSelect(point.start)}
            className="report-trend-point"
          >
            <MoneyDisplay amountIdr={point.totalIdr} />
            <span className="report-trend-track" aria-hidden="true">
              <i
                style={{
                  height: `${maximum > BigInt(0) ? Number((BigInt(point.totalIdr) * BigInt(10000)) / maximum) / 100 : 0}%`,
                }}
              />
            </span>
            <strong>{point.label}</strong>
          </button>
        ))}
      </div>
      <div
        className="report-trend-detail"
        aria-live="polite"
        aria-atomic="true"
      >
        <Info size={17} aria-hidden="true" />
        <p>
          {selected ? (
            <>
              <strong>{rangeLabel(selected.start, selected.end)}</strong>
              <br />
              {selected.count} transaksi ·{" "}
              <MoneyDisplay amountIdr={selected.totalIdr} />
            </>
          ) : (
            "Pilih batang untuk melihat rincian periode."
          )}
        </p>
      </div>
    </div>
  );
}
