import type { Metadata } from "next";
import { ActivityDashboard } from "@/features/activity/activity-dashboard";
export const metadata: Metadata = { title: "Aktivitas · Cashly" };
export default function ActivityPage() {
  return <ActivityDashboard />;
}
