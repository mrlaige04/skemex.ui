import type { Type } from '@angular/core';

export interface RichTableColumn<T> {
  label: string;
  /** Optional HTML header; defaults to `label`. */
  header?: string;
  key: string;
  render?: ((row: T) => string) | null;
  /** Renders an Angular cell component via TanStack flexRenderComponent (e.g. action buttons). */
  component?: Type<unknown>;
  accessorFn?: (row: T) => unknown;
  enableHiding?: boolean;
  enableSorting?: boolean;
}

export interface RichTablePaginationChange {
  pageNumber: number;
  page: number;
}
