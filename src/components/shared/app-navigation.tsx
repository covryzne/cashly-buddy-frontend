import Link from "next/link";
import { useOnline } from "@/lib/pwa/connectivity";
import {
  Home,
  ReceiptText,
  ChartNoAxesColumn,
  CircleUserRound,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const items = [
  { label: "Beranda", icon: Home, href: "/beranda", page: "home" },
  {
    label: "Aktivitas",
    icon: ReceiptText,
    href: "/aktivitas",
    page: "activity",
  },
  { label: "Laporan", icon: ChartNoAxesColumn, href: "/laporan", page: "reports" },
  { label: "Profil", icon: CircleUserRound, href: "/profil", page: "profile" },
];
export function AppNavigation({
  onAdd,
  onUpcoming,
  activePage = "home",
}: {
  onAdd: () => void;
  onUpcoming: (label: string) => void;
  activePage?: "home" | "activity" | "reports" | "profile";
}) {
  const online = useOnline();
  function item(entry: (typeof items)[number], mobile: boolean) {
    const Icon = entry.icon;
    const selected = entry.page === activePage;
    const className =
      (mobile ? "bottom-item" : "nav-item") + (selected ? " selected" : "");
    const content = (
      <>
        <Icon size={mobile ? 22 : 21} />
        <span>{entry.label}</span>
      </>
    );
    if (!online) return <a key={entry.label} href={entry.href} className={className} aria-current={selected ? "page" : undefined}>{content}</a>;
    return entry.href ? (
      <Link
        key={entry.label}
        href={entry.href}
        className={className}
        aria-current={selected ? "page" : undefined}
      >
        {content}
      </Link>
    ) : (
      <button
        key={entry.label}
        className={className}
        onClick={() => onUpcoming(entry.label)}
      >
        {content}
      </button>
    );
  }
  return (
    <>
      <aside className="sidebar">
        <p className="sidebar-menu-label">Menu utama</p>
        <p className="sidebar-tagline">Your little money adventure.</p>
        <nav aria-label="Navigasi desktop">
          {items.map((entry) => item(entry, false))}
        </nav>
        <Button onClick={onAdd}>
          <Plus size={20} />
          Catat pengeluaran
        </Button>
        <div className="sidebar-footer">
          <p>
            Langkah kecil hari ini,
            <br />
            kebiasaan baik esok hari.
          </p>
        </div>
      </aside>
      <nav className="bottom-nav" aria-label="Navigasi utama">
        {items.slice(0, 2).map((entry) => item(entry, true))}
        <button
          className="quick-add"
          aria-label="Catat pengeluaran"
          onClick={onAdd}
        >
          <Plus size={29} />
        </button>
        {items.slice(2).map((entry) => item(entry, true))}
      </nav>
    </>
  );
}
