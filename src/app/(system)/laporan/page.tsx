import type { Metadata } from "next";
import { ReportsDashboard } from "@/features/reports/reports-dashboard";
export const metadata: Metadata = { title: "Laporan · Cashly" };
export default function ReportsPage() {
  return <ReportsDashboard />;
}
