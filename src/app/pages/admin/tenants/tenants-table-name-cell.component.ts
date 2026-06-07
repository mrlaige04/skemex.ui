import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBuilding2 } from '@ng-icons/lucide';
import { HlmIconImports } from 'spartan/icon';
import {
  injectFlexRenderContext,
  type CellContext,
} from '@tanstack/angular-table';
import type { SaTenantDto } from '../../../models/admin/tenants.models';
import { TENANTS_TABLE_HOST } from './tenants-table-host';

@Component({
  selector: 'app-tenants-table-name-cell',
  imports: [NgIcon, ...HlmIconImports],
  providers: [provideIcons({ lucideBuilding2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2.5">
      <div
        class="border-border bg-muted/40 text-muted-foreground relative size-8 shrink-0 overflow-hidden rounded-md border text-xs font-semibold"
      >
        @if (logoUrl(); as src) {
          <img
            [src]="src"
            alt=""
            class="absolute inset-0 size-full object-cover"
            [class.hidden]="logoFailed()"
            (error)="onLogoError()"
          />
        }
        <span
          class="flex size-full items-center justify-center"
          [class.hidden]="!!logoUrl() && !logoFailed()"
          aria-hidden="true"
        >
          <ng-icon hlm name="lucideBuilding2" size="sm" />
        </span>
      </div>
      <span class="font-medium">{{ host.displayName(tenant()) }}</span>
    </div>
  `,
})
export class TenantsTableNameCellComponent {
  readonly host = inject(TENANTS_TABLE_HOST);
  private readonly ctx = injectFlexRenderContext<CellContext<SaTenantDto, unknown>>();

  readonly tenant = computed(() => this.ctx.row.original);
  readonly logoFailed = signal(false);

  readonly logoUrl = computed(() => this.tenant().logoUrl?.trim() || null);

  onLogoError(): void {
    this.logoFailed.set(true);
  }
}
