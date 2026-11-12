import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronUp, PlayCircle, RotateCcw, Route, UserRound, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button, useToast } from '@/components/ui';
import { DEMO_STEPS, runNextStep } from '@/demo/guidedDemo';

/**
 * Floating guide for the Jamie Morgan journey.
 * Intro → 12 steps (each runs a real store action and navigates) → finish screen.
 */
export function GuidedDemoPanel() {
  const demo = useStore((s) => s.demo);
  const staff = useStore((s) => s.staff);
  const beginDemo = useStore((s) => s.beginDemo);
  const exitDemo = useStore((s) => s.exitDemo);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the panel when it opens so keyboard users find it.
  useEffect(() => {
    if (demo.active) headingRef.current?.focus();
  }, [demo.active]);

  if (!demo.active) return null;

  const started = !!demo.refs.started;
  const index = demo.step; // next step to run
  const total = DEMO_STEPS.length;
  const next = DEMO_STEPS[index];
  const last = index > 0 ? DEMO_STEPS[index - 1] : undefined;
  const actorName = (id: string) => (id === 'patient' ? 'Jamie (patient)' : staff.find((s) => s.id === id)?.name ?? id);

  function begin() {
    beginDemo();
    navigate('/');
    toast({ title: 'Demo data reset', description: 'Jamie Morgan’s journey is ready to start.', tone: 'brand' });
  }

  function runStep() {
    setBusy(true);
    const res = runNextStep(useStore.getState);
    setBusy(false);
    if (!res.ok) {
      toast({ title: 'This step could not run', description: `${res.error} Try “Restart”.`, tone: 'red' });
      return;
    }
    navigate(res.outcome.route);
    // On small screens, shrink to a slim bar so the change itself is visible.
    if (window.innerWidth < 1024) setCollapsed(true);
  }

  return (
    <section
      aria-labelledby="demo-panel-title"
      className="fixed inset-x-2 bottom-10 z-40 rounded-2xl border border-ai-300 bg-white shadow-xl sm:inset-x-auto sm:right-4 sm:w-[24rem] dark:border-ai-700 dark:bg-ink-900"
    >
      <header className="flex items-center gap-2 rounded-t-2xl border-b border-ai-200 bg-ai-50 px-4 py-2.5 dark:border-ai-800 dark:bg-ai-950/60">
        <Route className="h-4 w-4 text-ai-700 dark:text-ai-300" aria-hidden="true" />
        <h2 id="demo-panel-title" ref={headingRef} tabIndex={-1} className="flex-1 text-sm font-semibold text-ai-900 outline-none dark:text-ai-100">
          Guided demo · Jamie Morgan
        </h2>
        {started && (
          <span className="text-xs font-medium text-ai-800 dark:text-ai-200" aria-live="polite">
            {Math.min(index, total)}/{total} done
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-md p-1 text-ai-800 hover:bg-ai-100 dark:text-ai-200 dark:hover:bg-ai-900"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand demo panel' : 'Collapse demo panel'}
        >
          {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={exitDemo}
          className="rounded-md p-1 text-ai-800 hover:bg-ai-100 dark:text-ai-200 dark:hover:bg-ai-900"
          aria-label="Close demo panel (progress is kept)"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {started && (
        <div className="h-1.5 bg-ai-100 dark:bg-ai-950" role="progressbar" aria-label="Demo progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index}>
          <div className="h-full bg-ai-600 transition-[width] motion-reduce:transition-none" style={{ width: `${(index / total) * 100}%` }} />
        </div>
      )}

      {collapsed && started && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm">
          <p className="min-w-0 flex-1 truncate text-ink-700 dark:text-ink-300">
            {next ? <>Next: <span className="font-medium">{next.title}</span></> : 'Journey complete 🎉'}
          </p>
          {next && (
            <Button size="sm" variant="ai" onClick={runStep} loading={busy}>
              Run step {index + 1}
            </Button>
          )}
        </div>
      )}

      {!collapsed && (
        <div className="max-h-[45vh] space-y-3 overflow-y-auto px-4 py-3 text-sm">
          {!started && (
            <>
              <p className="text-ink-700 dark:text-ink-300">
                Follow one fictional patient, <strong>Jamie Morgan</strong>, from an online request to an approved consultation note
                in 12 steps. Each step performs a real action, and the app takes you to where the change happened.
              </p>
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                Starting resets the clinic to its original demo data. Any changes you made will be cleared.
              </p>
              <div className="flex gap-2">
                <Button variant="ai" iconLeft={<PlayCircle className="h-4 w-4" aria-hidden="true" />} onClick={begin}>
                  Reset data &amp; begin
                </Button>
                <Button variant="ghost" onClick={exitDemo}>Not now</Button>
              </div>
            </>
          )}

          {started && last && (
            <div role="status" aria-live="polite" className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 dark:border-brand-800 dark:bg-brand-950/40">
              <p className="flex items-center gap-1.5 font-medium text-brand-900 dark:text-brand-100">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                Step {index}: {last.title}
              </p>
              <p className="mt-1 text-brand-900/90 dark:text-brand-200"><span className="font-medium">Look for: </span>{last.whatChanged}</p>
            </div>
          )}

          {started && next && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">Next · step {index + 1} of {total}</p>
              <p className="mt-0.5 font-semibold text-ink-900 dark:text-ink-100">{next.title}</p>
              <p className="mt-1 text-ink-700 dark:text-ink-300">{next.explanation}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-600 dark:text-ink-400">
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                Acting as: <span className="font-medium">{actorName(next.actingAs)}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="ai" onClick={runStep} loading={busy} iconLeft={<PlayCircle className="h-4 w-4" aria-hidden="true" />}>
                  Run step {index + 1}
                </Button>
                <Button variant="ghost" size="sm" onClick={begin} iconLeft={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}>
                  Restart
                </Button>
              </div>
            </div>
          )}

          {started && !next && (
            <div className="space-y-2">
              <p className="font-semibold text-ink-900 dark:text-ink-100">Journey complete 🎉</p>
              <p className="text-ink-700 dark:text-ink-300">
                Jamie went from an online request to a filed lab report and an approved note. Every AI draft was reviewed by a person
                first. Explore the record, activity log, or analytics, or replay the journey.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigate('/patients/p-jamie?tab=timeline')}>Open Jamie’s record</Button>
                <Button size="sm" variant="secondary" onClick={() => navigate('/activity')}>Activity log</Button>
                <Button size="sm" variant="ghost" onClick={begin} iconLeft={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}>
                  Replay
                </Button>
                <Button size="sm" variant="ghost" onClick={exitDemo}>Close</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
