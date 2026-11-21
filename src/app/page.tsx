import type { Metadata } from "next";
import { CashlyLanding } from "./landing/cashly-landing";

export const metadata: Metadata = {
  title: "Cashly · Catat Pengeluaran Tanpa Beban",
  description:
    "Kenali pengeluaranmu lewat catatan harian, scan struk, dan voice note. Bangun kebiasaan kecil ditemani Mochi.",
};

export default function RootPage() {
  return <CashlyLanding />;
}
