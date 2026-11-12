import { useState } from 'react';
import { Menu, Moon, RotateCcw, Sun } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { roleLabel } from '@/lib/format';
import { Button, Modal } from '@/components/ui';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const staff = useStore((s) => s.staff);
  const currentStaffId = useStore((s) => s.currentStaffId);
  const theme = useStore((s) => s.theme);
  const setCurrentStaff = useStore((s) => s.setCurrentStaff);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const resetDemo = useStore((s) => s.resetDemo);
  const [confirmOpen, setConfirmOpen] = useState(false);


  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 bg-ink-50/85 px-4 py-2.5 backdrop-blur sm:gap-3 dark:bg-ink-950/85">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        aria-controls="app-sidebar"
        className="rounded-lg p-2 text-ink-700 hover:bg-ink-100 lg:hidden dark:text-ink-300 dark:hover:bg-ink-800"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex-1" />

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
            className="h-9 max-w-[11rem] rounded-xl border-0 bg-ink-100 px-3 text-xs font-medium text-ink-800 sm:max-w-[15rem] sm:text-sm dark:bg-ink-900 dark:text-ink-100"
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
          variant="ghost"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          aria-label="Reset demo data"
          title="Reset demo data"
          className="w-9 px-0!"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </Button>
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
