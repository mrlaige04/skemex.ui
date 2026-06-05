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
import type { TenantUserDto } from '../../../models/users/users.models';
import { USERS_TABLE_HOST } from './users-table-host';

@Component({
  selector: 'app-users-table-actions-cell',
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
        [attr.aria-label]="'Remove ' + ariaName()"
        [disabled]="isDeleting()"
        (click)="onDelete()"
      >
        <ng-icon hlm name="lucideTrash2" size="sm" />
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersTableActionsCellComponent {
  private readonly host = inject(USERS_TABLE_HOST);
  private readonly ctx = injectFlexRenderContext<CellContext<TenantUserDto, unknown>>();

  readonly user = computed(() => this.ctx.row.original);
  readonly editLink = computed(() => this.host.editLink(this.user().id));
  readonly ariaName = computed(() => this.host.fullName(this.user()) || this.user().email);
  readonly isDeleting = computed(() => this.host.deletingId() === this.user().id);

  onDelete(): void {
    this.host.deleteUser(this.user());
  }
}
