import type { LucideIcon } from "lucide-react";
import { NotificationButton } from "@/features/notifications/notification-button";

export function AppPageHeader({
  title,
  description,
  icon: Icon,
  className = "",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <header className={`app-page-header ${className}`}>
      <div className="app-page-header-inner">
        <span className="app-page-header-icon">
          <Icon size={21} aria-hidden="true" />
        </span>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <NotificationButton />
      </div>
    </header>
  );
}
