import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Inbox } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { sortRequests } from '@/store/selectors';
import { Card, EmptyState, PageHeader, Tabs } from '@/components/ui';
import type { RequestStatus } from '@/types';
import { RequestTable } from './triage/RequestTable';
import { useScrollToHighlight } from './triage/shared';

const TABS: { value: string; label: string; statuses: RequestStatus[] }[] = [
  { value: 'new', label: 'New', statuses: ['new'] },
  { value: 'in_review', label: 'In review', statuses: ['in_review'] },
  { value: 'assigned', label: 'Assigned', statuses: ['assigned'] },
  { value: 'scheduled', label: 'Scheduled', statuses: ['scheduled'] },
  { value: 'done', label: 'Done', statuses: ['completed', 'closed'] },
];

export default function Triage() {
  const [requests, patients, staff] = useStore(useShallow((s) => [s.requests, s.patients, s.staff]));
  const highlight = useStore((s) => s.highlight);
  const [tab, setTab] = useState('new');

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.value, requests.filter((r) => t.statuses.includes(r.status)).length])),
    [requests],
  );
  const current = TABS.find((t) => t.value === tab) ?? TABS[0];
  const rows = useMemo(
    () => sortRequests(requests.filter((r) => current.statuses.includes(r.status))),
    [requests, current],
  );

  // If the highlighted request lives in another tab, switch to it.
  const target = highlight ? requests.find((r) => r.id === highlight) : undefined;
  const targetTab = target ? TABS.find((t) => t.statuses.includes(target.status))?.value : undefined;
  const [seen, setSeen] = useState<string | null>(null);
  if (targetTab && highlight !== seen) {
    setSeen(highlight);
    if (targetTab !== tab) setTab(targetTab);
  }
  useScrollToHighlight(highlight, rows.some((r) => r.id === highlight));

  return (
    <div>
      <PageHeader
        title="Triage queue"
        description="Work through requests from the most urgent and longest-waiting. Select a request to review it."
      />
      <Card>
        <Tabs
          label="Request status"
          className="px-3"
          value={tab}
          onChange={setTab}
          items={TABS.map((t) => ({ value: t.value, label: t.label, count: counts[t.value] }))}
        />
        <div role="tabpanel" aria-label={`${current.label} requests`}>
          {rows.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6" />}
              title={`Nothing in "${current.label}"`}
              description="Requests will appear here as their status changes."
            />
          ) : (
            <RequestTable rows={rows} patients={patients} staff={staff} highlight={highlight} waitColumn />
          )}
        </div>
      </Card>
    </div>
  );
}
