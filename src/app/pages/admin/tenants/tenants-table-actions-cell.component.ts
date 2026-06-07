import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucideTrash2 } from '@ng-icons/lucide';
import {
  injectFlexRenderContext,
  type CellContext,
} from '@tanstack/angular-table';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import type { SaTenantDto } from '../../../models/admin/tenants.models';
import { TENANTS_TABLE_HOST } from './tenants-table-host';

@Component({
  selector: 'app-tenants-table-actions-cell',
  imports: [RouterLink, NgIcon, ...HlmButtonImports, ...HlmIconImports],
  providers: [provideIcons({ lucidePencil, lucideTrash2 })],
  template: `
    <div class="flex justify-end gap-0.5">
      <a
        hlmBtn
        variant="ghost"
        size="icon"
        [routerLink]="editLink()"
        [attr.aria-label]="'Edit ' + ariaName()"
      >
        <ng-icon hlm name="lucidePencil" size="sm" />
      </a>
      <button
        type="button"
        hlmBtn
        variant="ghost"
        size="icon"
        class="text-destructive hover:text-destructive"
        [attr.aria-label]="'Delete ' + ariaName()"
        [disabled]="isDeleting()"
        (click)="onDelete()"
      >
        <ng-icon hlm name="lucideTrash2" size="sm" />
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantsTableActionsCellComponent {
  private readonly host = inject(TENANTS_TABLE_HOST);
  private readonly ctx = injectFlexRenderContext<CellContext<SaTenantDto, unknown>>();

  readonly tenant = computed(() => this.ctx.row.original);
  readonly editLink = computed(() => this.host.editLink(this.tenant().id));
  readonly ariaName = computed(() => this.host.displayName(this.tenant()));
  readonly isDeleting = computed(() => this.host.deletingId() === this.tenant().id);

  onDelete(): void {
    this.host.deleteTenant(this.tenant());
  }
}
