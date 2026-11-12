import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import type { ActorId, Staff } from '@/types';

/** Human-readable label for an activity actor / staff id. */
export function actorLabel(actor: ActorId | undefined, staff: Staff[]): string {
  if (!actor) return 'Unknown';
  if (actor === 'ai') return 'Simulated AI';
  if (actor === 'system') return 'System';
  if (actor === 'patient') return 'Patient';
  if (actor === 'automation') return 'Automation';
  return staff.find((s) => s.id === actor)?.name ?? actor;
}

export function staffNameOf(staff: Staff[], id?: string): string {
  return staff.find((s) => s.id === id)?.name ?? 'Unassigned';
}

/**
 * Demo highlight support: returns whether `id` is the highlighted entity. Scrolls the element
 * carrying data-entity-id={id} into view once when it becomes highlighted.
 */
export function useHighlight(id: string): boolean {
  const highlight = useStore((s) => s.highlight);
  const highlighted = highlight === id;
  useEffect(() => {
    if (!highlighted) return;
    const el = document.querySelector<HTMLElement>(`[data-entity-id="${CSS.escape(id)}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlighted, id]);
  return highlighted;
}
