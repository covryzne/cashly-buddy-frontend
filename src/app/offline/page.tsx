import { OfflineApp } from "@/features/offline/offline-app";
import { ExpenseSessionProvider } from "@/features/expenses/expense-session";
import { ProfileSessionProvider } from "@/features/profile/profile-session";

// This fallback waits for browser-local data rather than instant route rendering.
export const instant = false;

// Public, static UI only. Never read cookies, auth, or server financial data here.
export default function OfflinePage() {
  return <ExpenseSessionProvider><ProfileSessionProvider><OfflineApp /></ProfileSessionProvider></ExpenseSessionProvider>;
}
