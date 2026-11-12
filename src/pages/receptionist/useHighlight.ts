import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

/** Returns the highlighted entity id, and scrolls the matching [data-entity-id] element into view once per change. */
export function useHighlight(): string | null {
  const highlight = useStore((s) => s.highlight);
  useEffect(() => {
    if (!highlight) return;
    const el = document.querySelector(`[data-entity-id="${CSS.escape(highlight)}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlight]);
  return highlight;
}
