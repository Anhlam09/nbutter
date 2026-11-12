import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { STORAGE_ERROR_EVENT, useStore } from '@/store/useStore';
import { ToastProvider } from '@/components/ui';
import { GuidedDemoPanel } from '@/components/demo/GuidedDemoPanel';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  const theme = useStore((s) => s.theme);
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const [storageError, setStorageError] = useState<string | null>(null);
  useEffect(() => {
    const onError = (e: Event) => setStorageError((e as CustomEvent<string>).detail || 'Storage unavailable');
    window.addEventListener(STORAGE_ERROR_EVENT, onError);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, onError);
  }, []);

  return (
    <ToastProvider>
      <a
        href="#main"
        className="sr-only z-[100] rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      <Sidebar open={navOpen} onClose={closeNav} />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar onMenu={() => setNavOpen(true)} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-16 outline-none sm:px-6 lg:px-8">
          {storageError && (
            <p role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
              Your browser could not save the latest changes ({storageError}). Use <strong>Reset demo</strong> to free space.
            </p>
          )}
          <Outlet />
        </main>
        <div
          role="note"
          className="fixed inset-x-0 bottom-0 z-10 border-t border-ink-200 bg-ink-100/95 px-4 py-1.5 text-center text-xs text-ink-700 backdrop-blur lg:pl-64 dark:border-ink-800 dark:bg-ink-900/95 dark:text-ink-300"
        >
          Educational prototype · Fictional data · Simulated AI · Not a medical device, not for clinical use ·{' '}
          <a href={`${import.meta.env.BASE_URL}third-party-notices.txt`} target="_blank" rel="noopener" className="underline hover:text-ink-900 dark:hover:text-white">
            Licenses
          </a>
        </div>
      </div>
      <GuidedDemoPanel />
    </ToastProvider>
  );
}
