import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
export function SettingsRow({
  icon: Icon,
  title,
  description,
  value,
  onClick,
  href,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  value?: string;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <>
      <span className="settings-row-icon">
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="settings-row-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      {value && <span className="settings-row-value">{value}</span>}
      <ChevronRight size={17} aria-hidden="true" />
    </>
  );
  return href ? (
    <Link className="settings-row" href={href}>
      {content}
    </Link>
  ) : (
    <button type="button" className="settings-row" onClick={onClick}>
      {content}
    </button>
  );
}
