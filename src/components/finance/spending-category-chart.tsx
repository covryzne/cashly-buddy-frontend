"use client";

import Image from "next/image";
import { useId, type CSSProperties } from "react";
import { CategoryIcon } from "./category-icon";
import { MoneyDisplay } from "./money-display";
import type { Category } from "@/mocks/fixtures/home";

type ChartCategory = Category & { count: number; percent: number };

/** SVG ring/selection pattern reviewed against 21st Donut Chart #9377.
 * Uses Cashly tokens, integer-derived ratios and keyboard/touch selection;
 * no framer-motion dependency or hover-only information. */
export function SpendingCategoryChart({
  categories,
  selectedCode,
  onSelect,
  onDetails,
}: {
  categories: ChartCategory[];
  selectedCode: string | null;
  onSelect: (code: string | null) => void;
  onDetails: (code: string | null) => void;
}) {
  const titleId = useId();
  const selected = categories.find(
    (category) => category.code === selectedCode,
  );
  const total = categories.reduce(
    (sum, category) => sum + BigInt(category.amountIdr),
    BigInt(0),
  );
  const count = categories.reduce((sum, category) => sum + category.count, 0);
  const toggle = (code: string) =>
    onSelect(selectedCode === code ? null : code);
  const segments = categories.map((category, index) => {
    const length =
      total > BigInt(0)
        ? Number((BigInt(category.amountIdr) * BigInt(1000000)) / total) / 10000
        : 0;
    const before = categories
      .slice(0, index)
      .reduce((sum, entry) => sum + BigInt(entry.amountIdr), BigInt(0));
    const offset =
      total > BigInt(0)
        ? Number((before * BigInt(1000000)) / total) / 10000
        : 0;
    return { ...category, offset, length, index };
  });
  return (
    <div className="spending-category-chart">
      <div className="report-donut-wrap">
        <svg
          viewBox="0 0 240 240"
          className="report-donut"
          role="group"
          aria-labelledby={titleId}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onSelect(null);
            }
          }}
        >
          <title id={titleId}>
            Distribusi pengeluaran per kategori. Pilih bagian untuk menyorot
            kategori.
          </title>
          <circle
            cx="120"
            cy="120"
            r="96"
            fill="none"
            className="report-donut-track"
            strokeWidth="24"
          />
          <g transform="rotate(-90 120 120)">
            {segments
              .filter((segment) => segment.length > 0)
              .map((segment) => (
                <circle
                  key={segment.code}
                  cx="120"
                  cy="120"
                  r="96"
                  fill="none"
                  strokeWidth="24"
                  pathLength="100"
                  strokeDasharray={`${segment.length} ${100 - segment.length}`}
                  strokeDashoffset={-segment.offset}
                  style={
                    {
                      "--donut-x": `${(Math.cos(((segment.offset + segment.length / 2) * Math.PI) / 50) * 5).toFixed(3)}px`,
                      "--donut-y": `${(Math.sin(((segment.offset + segment.length / 2) * Math.PI) / 50) * 5).toFixed(3)}px`,
                    } as CSSProperties
                  }
                  className={`report-donut-segment report-series-${segment.index}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedCode === segment.code}
                  aria-label={`${segment.label}, ${segment.percent} persen, ${segment.count} transaksi`}
                  onClick={() => toggle(segment.code)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggle(segment.code);
                    }
                  }}
                  data-selected={selectedCode === segment.code}
                />
              ))}
          </g>
        </svg>
        <div
          className="report-donut-center"
          aria-live="polite"
          aria-atomic="true"
        >
          <Image
            src="/mascot/mochi-crown-transparent.webp"
            alt=""
            width={64}
            height={64}
          />
          <span>{selected?.label ?? "Semua kategori"}</span>
          <strong className={selected ? undefined : "report-donut-count"}>
            {selected ? `${selected.percent}%` : `${count} transaksi`}
          </strong>
        </div>
      </div>
      <div
        className="report-category-legend"
        role="group"
        aria-label="Pilih kategori laporan"
      >
        <button
          type="button"
          className="button button-ghost report-category-reset"
          aria-pressed={!selected}
          onClick={() => onSelect(null)}
        >
          Semua kategori
        </button>
        {categories.map((category, index) => (
          <button
            type="button"
            key={category.code}
            aria-pressed={category.code === selectedCode}
            className={`report-category report-series-${index}`}
            onClick={() => toggle(category.code)}
          >
            <CategoryIcon category={category} />
            <span className="report-category-name">
              <strong>{category.label}</strong>
              <small>{category.count} transaksi</small>
            </span>
            <span className="report-category-value">
              <MoneyDisplay amountIdr={category.amountIdr} />
              <small>{category.percent}%</small>
            </span>
            <span className="report-category-track" aria-hidden="true">
              <i style={{ width: `${category.percent}%` }} />
            </span>
          </button>
        ))}
      </div>
      {(selected ? selected.count > 0 : count > 0) && (
        <button
          type="button"
          className="button button-ghost report-category-details"
          onClick={() => onDetails(selected?.code ?? null)}
        >
          {selected
            ? `Lihat ${selected.count} transaksi ${selected.label.toLowerCase()}`
            : `Lihat semua ${count} transaksi`}{" "}
          <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
  );
}
