import type { Metadata } from "next";
import { CashlyLanding } from "./landing/cashly-landing";
import { HomeScreenEntry } from "./landing/home-screen-entry";

export const metadata: Metadata = {
  title: "Cashly · Catat Pengeluaran Tanpa Beban",
  description:
    "Kenali pengeluaranmu lewat catatan harian, scan struk, dan voice note. Bangun kebiasaan kecil ditemani Mochi.",
};

export default function RootPage() {
  return <HomeScreenEntry><CashlyLanding /></HomeScreenEntry>;
}
