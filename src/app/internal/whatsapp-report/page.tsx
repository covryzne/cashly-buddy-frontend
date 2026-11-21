import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ReportPrintDetails } from "@/components/finance/report-print-details";
import { ReportOverview } from "@/features/reports/report-overview";
import { selectReports } from "@/features/reports/select-reports";
import { apiExpensesSchema } from "@/lib/auth/types";
import { mapExpense } from "@/lib/finance";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

const requestSchema = z.object({ reply: z.uuid(), lease: z.uuid() });
const responseSchema = z.object({ data: z.object({
  expenses: apiExpensesSchema.shape.data, timezone: z.string(), start: z.iso.date(),
  end: z.iso.date(), period_label: z.string(),
}) });
const zoneLabels: Record<string, string> = {
  "Asia/Jakarta": "WIB", "Asia/Makassar": "WITA", "Asia/Jayapura": "WIT",
};

export default async function WhatsAppReport({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <Suspense><ReportContent searchParams={searchParams} /></Suspense>;
}

async function ReportContent({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = requestSchema.safeParse(await searchParams);
  const origin = process.env.CASHLY_API_ORIGIN;
  if (!query.success || !origin) notFound();
  const response = await fetch(new URL(`/api/v1/integrations/whatsapp/outbox/${query.data.reply}/report-data`, origin), {
    headers: { "X-Cashly-Report-Lease": query.data.lease },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) notFound();
  const { data } = responseSchema.parse(await response.json());
  const { start, end, timezone, period_label: periodLabel } = data;
  const snapshot = selectReports(data.expenses.map(mapExpense), { kind: "range", start, end }, timezone);
  const timezoneLabel = zoneLabels[timezone] ?? timezone;
  const selectedTrend = snapshot.trend.peak?.start ?? snapshot.trend.points[0]?.start ?? null;
  return (
    <div className="app-shell reports-page">
      <main className="reports-main">
        <div className="report-heading"><div><p>Analisis finansial</p><h2>Laporan Pengeluaran</h2></div></div>
        <ReportOverview snapshot={snapshot} periodLabel={periodLabel} timezoneLabel={timezoneLabel} selectedTrend={selectedTrend} />
        <ReportPrintDetails snapshot={snapshot} periodLabel={periodLabel} timezone={timezone} timezoneLabel={timezoneLabel} />
      </main>
    </div>
  );
}
