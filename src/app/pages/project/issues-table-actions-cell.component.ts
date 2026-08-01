import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTrash2 } from '@ng-icons/lucide';
import {
  injectFlexRenderContext,
  type CellContext,
} from '@tanstack/angular-table';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import type { ProjectTaskDto } from '../../models/projects/projects.models';
import { PROJECT_ISSUES_TABLE_HOST } from './project-issues-table-host';

@Component({
  selector: 'app-issues-table-actions-cell',
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
        [attr.aria-label]="'Delete ' + ariaName()"
        [disabled]="isBusy()"
        (click)="onDelete()"
      >
        <ng-icon hlm name="lucideTrash2" size="sm" />
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuesTableActionsCellComponent {
  private readonly host = inject(PROJECT_ISSUES_TABLE_HOST);
  private readonly ctx = injectFlexRenderContext<CellContext<ProjectTaskDto, unknown>>();

  readonly issue = computed(() => this.ctx.row.original);
  readonly ariaName = computed(() => this.issue().code || this.issue().title);
  readonly isBusy = computed(() => this.host.deletingId() === this.issue().id);

  onDelete(): void {
    this.host.deleteIssue(this.issue());
  }
}
