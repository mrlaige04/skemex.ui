import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-tenant-section-page',
  template: `
    <div class="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{{ heading() }}</h1>
        <p class="text-muted-foreground mt-1 text-sm">
          Tenant workspace placeholder — layout and routing are wired.
        </p>
      </div>
      <div class="grid gap-4 md:grid-cols-3">
        @for (i of [1, 2, 3]; track i) {
          <div class="border-border bg-card text-card-foreground min-h-28 rounded-xl border p-6 shadow-sm"></div>
        }
      </div>
      <div
        class="border-border bg-card text-card-foreground min-h-40 flex-1 rounded-xl border p-6 shadow-sm"
      ></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0 overflow-y-auto' },
})
export class TenantSectionPageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly heading = toSignal(
    this.route.data.pipe(map((d) => (d?.['breadcrumb'] as string) ?? '')),
    { initialValue: (this.route.snapshot.data['breadcrumb'] as string) ?? '' },
  );
}
