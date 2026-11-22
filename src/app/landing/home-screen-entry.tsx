'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AppLoader } from '@/components/shared/app-loader';
import { useInstallEnvironment } from '@/lib/pwa/install-environment';
import styles from './landing.module.css';

export function HomeScreenEntry({ children }: { children: ReactNode }) {
  const environment = useInstallEnvironment();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (environment !== 'standalone') return;

    const controller = new AbortController();
    async function openDashboard() {
      try {
        const response = await fetch('/auth/session', {
          cache: 'no-store',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
        });
        if (response.ok && (await response.json()).authenticated === true) {
          if (!controller.signal.aborted) window.location.replace('/beranda');
          return;
        }
      } catch {
        // The public landing remains available if the session can't be checked.
      }
      if (!controller.signal.aborted) setChecked(true);
    }
    void openDashboard();
    return () => controller.abort();
  }, [environment]);

  const pending = !checked && (environment === 'standalone' || environment === 'unknown');
  return (
    <div
      className={styles.homeScreenEntry}
      data-checking={pending || undefined}
      data-standalone={environment === 'standalone' || undefined}
    >
      <div className={styles.homeScreenContent}>{children}</div>
      {pending && <div className={`${styles.homeScreenLoader} app-loading-screen`}><AppLoader /></div>}
    </div>
  );
}
