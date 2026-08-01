import { InjectionToken, signal, type WritableSignal } from '@angular/core';

/** Selected row ids for the current rich-table instance (reactive). */
export type RichTableSelectionStore = WritableSignal<ReadonlySet<string>>;

export const RICH_TABLE_SELECTION = new InjectionToken<RichTableSelectionStore>(
  'RICH_TABLE_SELECTION',
);

export function createRichTableSelectionStore(): RichTableSelectionStore {
  return signal<ReadonlySet<string>>(new Set());
}

export function selectionIdsFromState(state: Record<string, boolean>): ReadonlySet<string> {
  return new Set(
    Object.entries(state)
      .filter(([, selected]) => selected)
      .map(([id]) => id),
  );
}
