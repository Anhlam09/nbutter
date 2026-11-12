import { useEffect, useRef, useState } from 'react';
import { BRAND } from '@/brand';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  BarChart3, ClipboardList, FileText, History, Inbox, LayoutDashboard, Mic, PhoneCall, PlayCircle, Share2, ShieldCheck, Users, Workflow, X, type LucideIcon,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/store/useStore';
import { selectNavCounts } from '@/store/selectors';

type CountKey = 'triage' | 'documents' | 'referrals';
interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  count?: CountKey;
}
const groups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/triage', label: 'Triage', icon: Inbox, count: 'triage' },
      { to: '/patients', label: 'Patients', icon: Users },
      { to: '/documents', label: 'Documents', icon: FileText, count: 'documents' },
      { to: '/scribe', label: 'Scribe', icon: Mic },
    ],
  },
  {
    label: 'Front desk',
    items: [
      { to: '/intake', label: 'Patient intake', icon: ClipboardList },
      { to: '/receptionist', label: 'AI Receptionist', icon: PhoneCall },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/referrals', label: 'Referrals & follow-ups', icon: Share2, count: 'referrals' },
      { to: '/automations', label: 'Automations', icon: Workflow },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/activity', label: 'Activity log', icon: History },
      { to: '/security', label: 'Security Lab', icon: ShieldCheck },
    ],
  },
];

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={clsx('flex h-9 w-9 items-center justify-center rounded-xl bg-brand-300 text-brand-950', className)} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h4l2.5-6 4 12 2.5-6H22" />
      </svg>
    </span>
  );
}

export interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const counts = useStore(useShallow(selectNavCounts));
  const startDemo = useStore((s) => s.startDemo);
  const { pathname } = useLocation();

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Below the lg breakpoint the sidebar is a drawer: hidden (and inert) unless open.
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia?.('(min-width: 1024px)').matches ?? true);
  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 1024px)');
    if (!mq) return;
    const update = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const asideRef = useRef<HTMLElement>(null);
  const drawerOpen = open && !isDesktop;

  useEffect(() => {
    if (!drawerOpen) return;
    const aside = asideRef.current;
    const focusables = () =>
      Array.from(aside?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
    const previous = document.activeElement as HTMLElement | null;
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      // Keep keyboard focus inside the open drawer.
      const list = focusables();
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [drawerOpen, onClose]);

  return (
    <>
      {open && (
        <div className="anim-fade-in fixed inset-0 z-30 bg-ink-900/50 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        ref={asideRef}
        id="app-sidebar"
        aria-label="Primary"
        inert={!open && !isDesktop}
        aria-modal={drawerOpen || undefined}
        role={drawerOpen ? 'dialog' : undefined}
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-950 transition-transform duration-200',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">{BRAND.shortName}</p>
              <p className="text-xs text-brand-300">{BRAND.tagline}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-1.5 text-brand-200 hover:bg-white/10 lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
          {groups.map((g, gi) => (
            <div key={g.label} className={gi > 0 ? 'mt-3 border-t border-white/10 pt-3' : ''}>
              <ul className="space-y-0.5" aria-label={g.label}>
                {g.items.map((item) => {
                  const n = item.count ? counts[item.count] : 0;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                          clsx(
                            'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-brand-300/20 text-white'
                              : 'text-brand-100/85 hover:bg-white/[0.07] hover:text-white',
                          )
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {n > 0 && (
                          <span className="text-xs font-semibold tabular-nums text-brand-300">
                            <span className="sr-only">{n} pending: </span>
                            {n}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              startDemo();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-brand-100/85 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            <PlayCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Guided demo
          </button>
        </div>
      </aside>
    </>
  );
}
