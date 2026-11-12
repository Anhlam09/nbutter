import { useEffect } from 'react';
import type { Activity, ActorId, Staff } from '@/types';
import type { TimelineItem } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';
import type { BadgeTone } from '@/components/ui';

export function actorLabel(actor: ActorId, staff: Staff[]): string {
  if (actor === 'patient') return 'Patient';
  if (actor === 'ai') return 'Simulated AI';
  if (actor === 'automation') return 'Automation';
  if (actor === 'system') return 'System';
  return staff.find((s) => s.id === actor)?.name ?? 'System';
}

const toneFor = (kind: string): BadgeTone => {
  if (kind.startsWith('request')) return 'brand';
  if (kind.startsWith('appointment')) return 'amber';
  if (kind.startsWith('document')) return 'sky';
  if (kind.startsWith('note')) return 'brand';
  if (kind.startsWith('task')) return 'green';
  if (kind.startsWith('automation')) return 'sky';
  return 'neutral';
};

export function activityItems(list: Activity[], staff: Staff[]): TimelineItem[] {
  return list.map((a) => ({
    id: a.id,
    at: fmtDateTime(a.at),
    title: a.message,
    actorLabel: actorLabel(a.actor, staff),
    tone: toneFor(a.kind),
  }));
}

/** Scrolls the element with data-entity-id === highlight into view once it becomes highlighted. */
export function useScrollToHighlight(highlight: string | null, ready = true) {
  useEffect(() => {
    if (!highlight || !ready) return;
    const el = document.querySelector<HTMLElement>(`[data-entity-id="${CSS.escape(highlight)}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlight, ready]);
}
