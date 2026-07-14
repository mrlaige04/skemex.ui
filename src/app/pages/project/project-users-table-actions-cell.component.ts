import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTrash2 } from '@ng-icons/lucide';
import {
  injectFlexRenderContext,
  type CellContext,
} from '@tanstack/angular-table';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import type { ProjectUserDto } from '../../models/projects/projects.models';
import { PROJECT_USERS_TABLE_HOST } from './project-users-table-host';

@Component({
  selector: 'app-project-users-table-actions-cell',
  imports: [NgIcon, ...HlmButtonImports, ...HlmIconImports],
  providers: [provideIcons({ lucideTrash2 })],
  template: `
    <div class="flex justify-end">
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
export class ProjectUsersTableActionsCellComponent {
  private readonly host = inject(PROJECT_USERS_TABLE_HOST);
  private readonly ctx = injectFlexRenderContext<CellContext<ProjectUserDto, unknown>>();

  readonly user = computed(() => this.ctx.row.original);
  readonly ariaName = computed(() => this.host.fullName(this.user()) || this.user().email);
  readonly isDeleting = computed(() => this.host.deletingId() === this.user().id);

  onDelete(): void {
    this.host.removeUser(this.user());
  }
}
