import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Moon, RotateCcw, Search, Sun } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { roleLabel } from '@/lib/format';
import { Avatar, Button, Modal } from '@/components/ui';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const navigate = useNavigate();
  const staff = useStore((s) => s.staff);
  const currentStaffId = useStore((s) => s.currentStaffId);
  const theme = useStore((s) => s.theme);
  const setCurrentStaff = useStore((s) => s.setCurrentStaff);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const resetDemo = useStore((s) => s.resetDemo);
  const [q, setQ] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const current = staff.find((s) => s.id === currentStaffId);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/patients?q=${encodeURIComponent(term)}` : '/patients');
  };

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-ink-200 bg-white/90 px-4 py-2.5 backdrop-blur sm:gap-3 dark:border-ink-800 dark:bg-ink-900/90">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        aria-controls="app-sidebar"
        className="rounded-lg p-2 text-ink-700 hover:bg-ink-100 lg:hidden dark:text-ink-300 dark:hover:bg-ink-800"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <form onSubmit={submit} role="search" className="relative hidden min-w-0 max-w-md flex-1 sm:block">
        <label htmlFor="global-search" className="sr-only">
          Search patients
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
        <input
          id="global-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search patients by name or NHS no."
          className="h-10 w-full rounded-xl border border-ink-300 bg-ink-50 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-500 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:placeholder:text-ink-400"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center">
          <label htmlFor="role-switcher" className="sr-only">
            Current user and role
          </label>
          <select
            id="role-switcher"
            value={currentStaffId}
            onChange={(e) => setCurrentStaff(e.target.value)}
            title="Switch role to try role-based approvals"
            className="h-9 max-w-[10rem] rounded-xl border border-ink-300 bg-white px-2 text-xs text-ink-900 sm:max-w-[15rem] sm:text-sm dark:border-ink-600 dark:bg-ink-900 dark:text-ink-100"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {roleLabel(s.role)}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-9 px-0!"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          iconLeft={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
          title="Reset all demo data"
        >
          <span className="hidden sm:inline">Reset demo</span>
          <span className="sr-only sm:hidden">Reset demo</span>
        </Button>

        {current && <Avatar initials={current.initials} label={`${current.name}, ${roleLabel(current.role)}`} />}
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Reset demo data?"
        description="This restores all fictional patients, requests, documents and activity to their starting state. Your changes will be lost."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetDemo();
                setConfirmOpen(false);
              }}
            >
              Reset demo
            </Button>
          </>
        }
      />
    </header>
  );
}
