import { useNavigate } from 'react-router-dom';
import type { Patient, PatientRequest, Staff } from '@/types';
import { RequestStatusBadge, UrgencyBadge, Table, THead, TBody, TR, TH, TD } from '@/components/ui';
import { channelLabel, fmtDuration, minutesBetween, relativeTime } from '@/lib/format';

export function RequestTable({
  rows, patients, staff, highlight, waitColumn,
}: {
  rows: PatientRequest[]; patients: Patient[]; staff: Staff[]; highlight: string | null; waitColumn?: boolean;
}) {
  const navigate = useNavigate();
  const now = new Date().toISOString();
  return (
    <Table aria-label="Patient requests">
      <THead>
        <tr>
          <TH>Patient</TH>
          <TH>Request</TH>
          <TH>Urgency</TH>
          <TH>Status</TH>
          <TH>Assigned</TH>
          <TH>{waitColumn ? 'Waiting' : 'Received'}</TH>
        </tr>
      </THead>
      <TBody>
        {rows.map((r) => {
          const p = patients.find((x) => x.id === r.patientId);
          const a = staff.find((x) => x.id === r.assigneeId);
          return (
            <TR
              key={r.id}
              data-entity-id={r.id}
              highlighted={highlight === r.id}
              onClick={() => navigate(`/triage/${r.id}`)}
              aria-label={`Open request: ${r.subject}`}
              className={highlight === r.id ? 'ring-2 ring-inset ring-brand-400' : undefined}
            >
              <TD className="whitespace-nowrap">
                <span className="font-medium text-ink-900 dark:text-ink-50">{p?.name ?? 'Unknown patient'}</span>
              </TD>
              <TD className="max-w-xs">
                <span className="block truncate" title={`${r.subject} · ${channelLabel(r.channel)}`}>{r.subject}</span>
              </TD>
              <TD><UrgencyBadge urgency={r.urgency} /></TD>
              <TD><RequestStatusBadge status={r.status} /></TD>
              <TD>
                {a ? (
                  <span className="whitespace-nowrap">{a.name}</span>
                ) : (
                  <span className="text-ink-600 dark:text-ink-400">Unassigned</span>
                )}
              </TD>
              <TD className="whitespace-nowrap text-ink-600 dark:text-ink-400">
                {waitColumn ? `waiting ${fmtDuration(Math.max(0, minutesBetween(r.createdAt, now)))}` : relativeTime(r.createdAt)}
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
