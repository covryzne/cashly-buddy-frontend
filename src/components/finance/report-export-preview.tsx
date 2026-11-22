"use client";

import Image from "next/image";
import { useId, type Ref } from "react";
import {
  BookOpen,
  ChartNoAxesColumn,
  FileText,
  ReceiptText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReportSnapshot } from "@/features/reports/select-reports";
import { CategoryIcon } from "./category-icon";
import { MoneyDisplay } from "./money-display";

export function ReportExportPreview({
  snapshot,
  periodLabel,
  digestTitle,
  text,
  showText,
  onToggleText,
  textRef,
  feedback,
}: {
  snapshot: ReportSnapshot;
  periodLabel: string;
  digestTitle: string;
  text: string;
  showText: boolean;
  onToggleText: () => void;
  textRef: Ref<HTMLTextAreaElement>;
  feedback: string;
}) {
  const textId = useId();
  const disclosureId = useId();
  const dominant = snapshot.ranked[0];
  return (
    <div className="report-export-preview">
      <span className="pill">
        <BookOpen size={12} />
        {periodLabel}
      </span>
      <div className="report-export-intro">
        <h3>Ringkasan yang siap kamu simpan.</h3>
        <p>
          Cetak / PDF memuat ringkasan dan rincian transaksi per kategori.
          Kamu juga bisa menyalin teks ringkasan untuk dibagikan.
        </p>
      </div>
      <article
        className="report-export-digest"
        aria-label="Pratinjau ringkasan pengeluaran"
      >
        <header className="report-export-digest-header">
          <span className="report-export-digest-icon">
            <ChartNoAxesColumn size={17} aria-hidden="true" />
          </span>
          <div>
            <p>Laporan pengeluaran</p>
            <h4>{digestTitle}</h4>
          </div>
          <span className="report-export-timezone">WIB</span>
        </header>
        <dl className="report-export-stats">
          <div>
            <dt>Total Pengeluaran</dt>
            <dd>
              <span className="report-export-metric-value">
                <MoneyDisplay amountIdr={snapshot.totalIdr} />
              </span>
              <span className="report-export-transactions">
                <ReceiptText size={10} aria-hidden="true" />
                {snapshot.count} transaksi
              </span>
            </dd>
          </div>
          <div>
            <dt>Rata-rata Harian</dt>
            <dd>
              <span className="report-export-metric-value">
                <MoneyDisplay amountIdr={snapshot.averageIdr} />
                <small>/hari</small>
              </span>
              <span className="report-export-calendar-days">
                {snapshot.days} hari kalender
              </span>
            </dd>
          </div>
        </dl>
        <div className="report-export-columns" aria-hidden="true">
          <span>Kategori pengeluaran</span>
          <span>Porsi & nominal</span>
        </div>
        <ul
          className="report-export-categories"
          aria-label="Rincian kategori ekspor"
        >
          {snapshot.categories.map((category, index) => (
            <li
              key={category.code}
              className={`report-export-category report-series-${index} ${category.count ? "" : "is-empty"}`}
            >
              <div className="report-export-category-main">
                <CategoryIcon category={category} />
                <span className="report-export-category-label">
                  <strong>{category.label}</strong>
                  <small>{category.count} transaksi</small>
                </span>
                <span className="report-export-category-value">
                  <MoneyDisplay amountIdr={category.amountIdr} />
                  <span>{category.percent}%</span>
                </span>
              </div>
              {category.count > 0 && (
                <span className="report-export-category-bar" aria-hidden="true">
                  <i style={{ width: `${category.percent}%` }} />
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="report-export-text-toggle">
          <span>
            <FileText size={13} aria-hidden="true" />
            Format teks siap salin
          </span>
          <Button
            variant="ghost"
            onClick={onToggleText}
            aria-expanded={showText}
            aria-controls={disclosureId}
          >
            {showText ? "Tutup teks asli" : "Lihat teks asli"}
          </Button>
        </div>
        <div
          id={disclosureId}
          className="report-export-raw-text"
          hidden={!showText}
        >
          <label htmlFor={textId}>Teks ringkasan</label>
          <textarea id={textId} ref={textRef} readOnly value={text} rows={8} />
        </div>
      </article>
      <aside className="report-export-tip" aria-label="Tips Mochi">
        <span>
          <Image
            src="/mascot/mochi-crown-transparent.webp"
            alt=""
            width={32}
            height={32}
          />
        </span>
        <p>
          <strong>Tips Mochi: </strong>
          {dominant ? (
            <>
              Pengeluaran terbesar pada periode ini adalah{" "}
              <b>
                {dominant.label} ({dominant.percent}%)
              </b>
              . Satu catatan kecil membantu kamu mengenali kebiasaanmu.
            </>
          ) : (
            "Belum ada pengeluaran pada periode ini. Pilih periode lain untuk melihat cerita pengeluaranmu."
          )}
        </p>
      </aside>
      {feedback && (
        <p className="report-export-feedback" role="status">
          {feedback}
        </p>
      )}
    </div>
  );
}
