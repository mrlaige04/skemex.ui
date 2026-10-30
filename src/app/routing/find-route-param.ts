import type { ActivatedRoute } from '@angular/router';

/** Walks up the activated route tree until the named param is found. */
export function findRouteParam(route: ActivatedRoute, name: string): string {
  let current: ActivatedRoute | null = route;
  while (current) {
    const value = current.snapshot.paramMap.get(name)?.trim();
    if (value) {
      return value;
    }
    current = current.parent;
  }
  return '';
}
