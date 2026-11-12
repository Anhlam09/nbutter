import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Users, TriangleAlert } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/store/useStore';
import { isOpenRequest } from '@/store/selectors';
import { ageFromDob } from '@/lib/format';
import { Badge, Card, EmptyState, Input, PageHeader, Table, TBody, TD, TH, THead, TR } from '@/components/ui';
import { staffNameOf, useHighlight } from './patients/helpers';
import type { Patient } from '@/types';

interface Row {
  patient: Patient;
  openRequests: number;
  openTasks: number;
}

function PatientRow({ row, gp }: { row: Row; gp: string }) {
  const navigate = useNavigate();
  const { patient: p } = row;
  const highlighted = useHighlight(p.id);
  const active = p.conditions.filter((c) => c.status === 'active');
  return (
    <TR
      data-entity-id={p.id}
      highlighted={highlighted}
      onClick={() => navigate(`/patients/${p.id}`)}
      className={highlighted ? 'ring-2 ring-inset ring-ai-500' : undefined}
    >
      <TD>
        <Link
          to={`/patients/${p.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-brand-800 hover:underline dark:text-brand-300"
        >
          {p.name}
        </Link>
        {p.allergies.length > 0 && (
          <Badge tone="red" className="ml-2">
            <TriangleAlert className="h-3 w-3" aria-hidden="true" />
            Allergy
          </Badge>
        )}
      </TD>
      <TD className="whitespace-nowrap">{p.nhsNumber}</TD>
      <TD>{ageFromDob(p.dob)}</TD>
      <TD>{gp}</TD>
      <TD>
        {active.length ? (
          <span className="text-ink-700 dark:text-ink-300">{active.map((c) => c.label).join(', ')}</span>
        ) : (
          <span className="text-ink-600 dark:text-ink-400">None recorded</span>
        )}
      </TD>
      <TD>{row.openRequests}</TD>
      <TD>{row.openTasks}</TD>
    </TR>
  );
}

export default function Patients() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [patients, requests, tasks, staff] = useStore(useShallow((s) => [s.patients, s.requests, s.tasks, s.staff]));

  const rows = useMemo<Row[]>(() => {
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\s+/g, '');
    return patients
      .filter((p) => {
        if (!needle) return true;
        return (
          p.name.toLowerCase().includes(needle) ||
          p.nhsNumber.replace(/\s+/g, '').includes(digits) ||
          p.conditions.some((c) => c.label.toLowerCase().includes(needle))
        );
      })
      .map((p) => ({
        patient: p,
        openRequests: requests.filter((r) => r.patientId === p.id && isOpenRequest(r)).length,
        openTasks: tasks.filter((t) => t.patientId === p.id && t.status === 'open').length,
      }))
      .sort((a, b) => a.patient.name.localeCompare(b.patient.name));
  }, [patients, requests, tasks, q]);

  return (
    <div>
      <PageHeader
        title="Patients"
        description="Search fictional patients by name, NHS number, or condition. Select a row to open the record."
      />
      <div className="mb-4 max-w-md">
        <label htmlFor="patient-search" className="sr-only">Search patients</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-500" aria-hidden="true" />
          <Input
            id="patient-search"
            type="search"
            value={q}
            placeholder="Search name, NHS number, condition"
            className="pl-9"
            onChange={(e) => {
              const v = e.target.value;
              setParams(v ? { q: v } : {}, { replace: true });
            }}
          />
        </div>
      </div>
      <Card>
        <p className="border-b border-ink-200 px-4 py-2 text-xs text-ink-600 dark:border-ink-800 dark:text-ink-400" aria-live="polite">
          {rows.length} of {patients.length} patients
        </p>
        {rows.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No patients match your search"
            description="Try a different name, part of an NHS number, or clear the search box."
          />
        ) : (
          <Table className="min-w-[56rem]">
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>NHS no.</TH>
                <TH>Age</TH>
                <TH>Registered GP</TH>
                <TH>Active conditions</TH>
                <TH>Open requests</TH>
                <TH>Open tasks</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((r) => (
                <PatientRow key={r.patient.id} row={r} gp={staffNameOf(staff, r.patient.registeredGpId)} />
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
