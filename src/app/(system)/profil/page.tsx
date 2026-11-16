import type { Metadata } from "next";
import { ProfileDashboard } from "@/features/profile/profile-dashboard";
export const metadata: Metadata = { title: "Profil · Cashly" };
export default function ProfilePage() {
  return <ProfileDashboard />;
}
