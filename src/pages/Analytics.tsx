import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CheckSquare, ClipboardList, FileText, Inbox, Sparkles, Timer } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { computeAnalytics } from '@/store/selectors';
import { channelLabel, fmtDuration, statusLabel, urgencyLabel } from '@/lib/format';
import { ChartCard, ColoredBars, DataTable, SeriesBars, usePalette } from '@/pages/analytics/charts';

export default function Analytics() {
  const dark = useStore((s) => s.theme) === 'dark';
  const [requests, tasks, documents, notes, referrals, staff, appointments] = useStore(
    useShallow((s) => [s.requests, s.tasks, s.documents, s.notes, s.referrals, s.staff, s.appointments] as const),
  );
  const m = useMemo(
    () => computeAnalytics({ requests, tasks, documents, notes, referrals, staff, appointments }),
    [requests, tasks, documents, notes, referrals, staff, appointments],
  );
  const p = usePalette(dark);
  const t = m.totals;
  const total14 = m.perDay.reduce((n, d) => n + d.requests, 0);
  const done14 = m.perDay.reduce((n, d) => n + d.completed, 0);
  const editedPct = t.aiNotesApproved ? Math.round((t.aiNotesEdited / t.aiNotesApproved) * 100) : 0;
  const peak = m.perDay.reduce((a, b) => (b.requests > a.requests ? b : a), m.perDay[0]);

  const urgency = m.byUrgency.map((u) => ({ name: urgencyLabel(u.urgency), value: u.count }));
  const status = m.byStatus.map((s) => ({ name: statusLabel(s.status), value: s.count }));
  const channel = m.byChannel.map((c) => ({ name: channelLabel(c.channel), value: c.count }));
  const workload = m.workload.map((w) => ({ name: w.name, openRequests: w.openRequests, openTasks: w.openTasks }));
  const days = m.perDay.map((d) => ({ name: d.label, requests: d.requests, completed: d.completed }));
  const list = (d: { name: string; value: number }[]) => d.map((x) => `${x.name} ${x.value}`).join(', ');

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="How the practice is doing across requests, tasks, documents and AI-drafted notes."
      />
      <p className="mb-6 rounded-xl bg-ink-100 p-3 text-sm text-ink-700 dark:bg-ink-800 dark:text-ink-300">
        All figures come from local, fictional demo data stored in your browser. They update live as you use the other pages.
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Requests (last 14 days)" value={total14} hint={`${done14} completed in the same period`} icon={<Inbox className="h-4 w-4" />} />
        <StatCard label="Median first response" value={m.medianFirstResponseMins ? fmtDuration(m.medianFirstResponseMins) : 'n/a'} hint="From request received to first staff action" icon={<Timer className="h-4 w-4" />} />
        <StatCard label="Median time to resolution" value={m.medianResolutionMins ? fmtDuration(m.medianResolutionMins) : 'n/a'} hint="Completed requests only" icon={<ClipboardList className="h-4 w-4" />} />
        <StatCard label="Open tasks" value={t.openTasks} hint={`${t.overdueTasks} overdue`} delta={t.overdueTasks ? 'Needs attention:' : undefined} deltaTone="bad" icon={<CheckSquare className="h-4 w-4" />} />
        <StatCard label="Documents to review" value={t.documentsToReview} hint={`${t.documentsFiled} filed`} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="AI notes approved" value={t.aiNotesApproved} hint={t.aiNotesApproved ? `${editedPct}% edited by a clinician before approval` : 'None approved yet'} icon={<Sparkles className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <ChartCard
            title="Requests per day" description="Received and completed, last 14 days"
            summary={`${total14} requests received and ${done14} completed. Busiest day: ${peak.label} with ${peak.requests}.`}
            table={<DataTable caption="Requests per day" head={['Day', 'Received', 'Completed']} rows={m.perDay.map((d) => [d.label, d.requests, d.completed])} />}
          >
            <SeriesBars data={days} p={p} legend series={[
              { key: 'requests', label: 'Received', color: p.blue },
              { key: 'completed', label: 'Completed', color: p.orange },
            ]} />
          </ChartCard>
        </div>
        <ChartCard
          title="Urgency mix" description="All requests, from most to least urgent"
          summary={list(urgency) + '.'}
          table={<DataTable caption="Requests by urgency" head={['Urgency', 'Requests']} rows={urgency.map((u) => [u.name, u.value])} />}
        >
          <ColoredBars data={urgency} colors={p.ramp} p={p} label="Requests" />
        </ChartCard>
        <ChartCard
          title="Request status" description="Where requests are in the workflow"
          summary={list(status) + '.'}
          table={<DataTable caption="Requests by status" head={['Status', 'Requests']} rows={status.map((u) => [u.name, u.value])} />}
        >
          <ColoredBars data={status} colors={[p.blue]} p={p} label="Requests" />
        </ChartCard>
        <ChartCard
          title="Channel mix" description="How patients get in touch"
          summary={list(channel) + '.'}
          table={<DataTable caption="Requests by channel" head={['Channel', 'Requests']} rows={channel.map((u) => [u.name, u.value])} />}
        >
          <ColoredBars data={channel} colors={[p.blue, p.orange, p.aqua, p.yellow]} p={p} label="Requests" />
        </ChartCard>
        <ChartCard
          title="Staff workload" description="Open requests and open tasks per person"
          summary={workload.map((w) => `${w.name}: ${w.openRequests} requests, ${w.openTasks} tasks`).join('; ') + '.'}
          table={<DataTable caption="Open work per staff member" head={['Staff', 'Open requests', 'Open tasks']} rows={workload.map((w) => [w.name, w.openRequests, w.openTasks])} />}
        >
          <SeriesBars data={workload} p={p} horizontal stacked legend series={[
            { key: 'openRequests', label: 'Open requests', color: p.blue },
            { key: 'openTasks', label: 'Open tasks', color: p.orange },
          ]} />
        </ChartCard>
      </div>
    </div>
  );
}
