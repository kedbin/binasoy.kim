import { useSyncExternalStore } from 'react';

/** Same breakpoint as LaptopScreen's useIsCompact (KimOS modal vs on-screen). */
const mq = typeof window !== 'undefined' ? window.matchMedia('(max-width: 819px), (max-height: 519px)') : null;
export function useCompact() {
  return useSyncExternalStore(
    (cb) => { mq?.addEventListener('change', cb); return () => mq?.removeEventListener('change', cb); },
    () => !!mq?.matches,
  );
}
