import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  injectFlexRenderContext,
  type CellContext,
} from '@tanstack/angular-table';
import type { ProjectTaskDto } from '../../models/projects/projects.models';
import { projectSectionPath } from '../../routing/app-paths';
import {
  PROJECT_ISSUES_TABLE_HOST,
  type ProjectIssuesTableHost,
} from './project-issues-table-host';

@Component({
  selector: 'app-issues-key-cell',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      class="hover:text-primary text-sm font-bold text-white underline-offset-2 hover:underline"
      [routerLink]="link()"
    >
      {{ code() }}
    </a>
  `,
})
export class IssuesKeyCellComponent {
  private readonly ctx = injectFlexRenderContext<CellContext<ProjectTaskDto, unknown>>();
  private readonly host = inject<ProjectIssuesTableHost>(PROJECT_ISSUES_TABLE_HOST);

  readonly code = computed(() => this.ctx.row.original.code);

  readonly link = computed(() =>
    projectSectionPath(this.host.projectCode(), `issues/${this.ctx.row.original.code}`),
  );
}
