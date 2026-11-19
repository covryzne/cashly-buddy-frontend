import { OfflineApp } from "@/features/offline/offline-app";

// This fallback waits for browser-local data rather than instant route rendering.
export const instant = false;

// Public, static UI only. Never read cookies, auth, or server financial data here.
export default function OfflinePage() {
  return <OfflineApp />;
}
