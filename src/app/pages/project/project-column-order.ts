import type { ProjectColumnDto } from '../../models/projects/projects.models';

export interface ProjectColumnReorderError {
  columnTitle: string;
  columnKey: string;
  currentSortOrder: number;
  requiredSortOrder: number;
}

export function computeProjectColumnSortOrders(
  columnsInVisualOrder: ProjectColumnDto[],
): Map<string, number> {
  const sortOrders = new Map<string, number>();
  const taken = new Set<number>();

  for (const column of columnsInVisualOrder) {
    if (!column.isSortOrderForced || column.forcedSortOrder == null) {
      continue;
    }

    sortOrders.set(column.id, column.forcedSortOrder);
    taken.add(column.forcedSortOrder);
  }

  const maxSortOrder = Math.max(
    columnsInVisualOrder.length,
    taken.size > 0 ? Math.max(...taken) + 1 : columnsInVisualOrder.length,
  );

  const availableSlots: number[] = [];
  for (let slot = 0; slot <= maxSortOrder + columnsInVisualOrder.length; slot++) {
    if (!taken.has(slot)) {
      availableSlots.push(slot);
    }
  }

  let slotIndex = 0;
  for (const column of columnsInVisualOrder) {
    if (sortOrders.has(column.id)) {
      continue;
    }

    sortOrders.set(column.id, availableSlots[slotIndex]!);
    taken.add(availableSlots[slotIndex]!);
    slotIndex += 1;
  }

  return sortOrders;
}

export function validateProjectColumnSortOrders(
  columnsInVisualOrder: ProjectColumnDto[],
  sortOrders: Map<string, number>,
): ProjectColumnReorderError[] {
  const errors: ProjectColumnReorderError[] = [];

  for (const column of columnsInVisualOrder) {
    if (!column.isSortOrderForced || column.forcedSortOrder == null) {
      continue;
    }

    const assigned = sortOrders.get(column.id);
    if (assigned !== column.forcedSortOrder) {
      errors.push({
        columnTitle: column.title,
        columnKey: column.key,
        currentSortOrder: assigned ?? -1,
        requiredSortOrder: column.forcedSortOrder,
      });
    }
  }

  return errors;
}

export function formatSortOrder(position: number): string {
  return String(position + 1);
}
