"use client";

import { useSyncExternalStore } from "react";
import { OfflineDocumentContext } from "@/lib/pwa/connectivity";
import { HomeDashboard } from "@/features/home/home-dashboard";
import { ActivityDashboard } from "@/features/activity/activity-dashboard";
import { ReportsDashboard } from "@/features/reports/reports-dashboard";
import { ProfileDashboard } from "@/features/profile/profile-dashboard";

const subscribe = () => () => {};
// The worker preserves navigation URLs while returning the public offline shell.
export function OfflineApp() {
  return <OfflineDocumentContext.Provider value={true}><OfflineContent /></OfflineDocumentContext.Provider>;
}
function OfflineContent() {
  const path = useSyncExternalStore(subscribe, () => window.location.pathname, () => "/offline");
  if (path === "/offline") return <main className="local-data-empty"><h1>Pratinjau offline Cashly</h1><p>Buka Beranda untuk membaca salinan data di perangkat.</p><a className="button button-primary" href="/beranda">Buka Beranda</a></main>;
  if (path === "/aktivitas") return <ActivityDashboard />;
  if (path === "/laporan") return <ReportsDashboard />;
  if (path === "/profil") return <ProfileDashboard />;
  return <HomeDashboard />;
}
