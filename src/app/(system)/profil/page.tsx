import type { Metadata } from "next";
import { ProfileDashboard } from "@/features/profile/profile-dashboard";
export const metadata: Metadata = { title: "Profil · Cashly" };
export default function ProfilePage() {
  const environment = process.env.CASHLY_ENV;
  return <ProfileDashboard
    allowPushTest={environment === "dev" || environment === "staging"}
    fixedReminderSchedule={environment === "prod"}
  />;
}
