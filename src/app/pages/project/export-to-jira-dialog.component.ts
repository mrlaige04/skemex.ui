import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle, lucideUpload } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCheckboxImports } from 'spartan/checkbox';
import { HlmDialogImports } from 'spartan/dialog';
import { HlmIconImports } from 'spartan/icon';
import { problemDetailMessage } from '../../http/problem-details';
import type {
  ExportTasksToJiraResultDto,
  JiraExportScope,
} from '../../models/integrations/jira.models';
import { JiraIntegrationsService } from '../../services/integrations/jira-integrations.service';

export interface ExportToJiraDialogContext {
  projectId: string;
  search: string;
  columnId: string | null;
  assigneeId: string | null;
  unassigned: boolean;
  selectedTaskIds: string[];
  filteredTotalHint: number;
}

@Component({
  selector: 'app-export-to-jira-dialog',
  imports: [NgIcon, ...HlmButtonImports, ...HlmCheckboxImports, ...HlmDialogImports, ...HlmIconImports],
  providers: [provideIcons({ lucideLoaderCircle, lucideUpload })],
  templateUrl: './export-to-jira-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportToJiraDialogComponent {
  private readonly jiraService = inject(JiraIntegrationsService);

  readonly state = model<'open' | 'closed'>('closed');
  readonly context = input<ExportToJiraDialogContext | null>(null);

  readonly scope = signal<JiraExportScope>('AllFiltered');
  readonly skipAlreadyExported = signal(true);
  readonly exporting = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<ExportTasksToJiraResultDto | null>(null);

  readonly hasSelection = computed(() => (this.context()?.selectedTaskIds.length ?? 0) > 0);

  readonly hasFilterContext = computed(() => {
    const ctx = this.context();
    if (!ctx) {
      return false;
    }
    return (
      !!ctx.search.trim()
      || ctx.columnId != null
      || ctx.assigneeId != null
      || ctx.unassigned
    );
  });

  readonly scopeHint = computed(() => {
    const ctx = this.context();
    if (!ctx) {
      return '';
    }
    switch (this.scope()) {
      case 'Selected':
        return `${ctx.selectedTaskIds.length} selected task(s)`;
      case 'All':
        return 'All tasks in this project (up to 200)';
      default:
        return `Tasks matching current filters (~${ctx.filteredTotalHint} on list)`;
    }
  });

  onStateChanged(next: 'open' | 'closed'): void {
    this.state.set(next);
    if (next === 'open') {
      this.error.set(null);
      this.result.set(null);
      this.scope.set(this.hasSelection() ? 'Selected' : 'All');
      this.skipAlreadyExported.set(true);
    }
  }

  setScope(scope: JiraExportScope): void {
    if (scope === 'Selected' && !this.hasSelection()) {
      return;
    }
    this.scope.set(scope);
  }

  toggleSkip(checked: boolean): void {
    this.skipAlreadyExported.set(checked);
  }

  async runExport(): Promise<void> {
    const ctx = this.context();
    if (!ctx || this.exporting()) {
      return;
    }

    this.exporting.set(true);
    this.error.set(null);
    this.result.set(null);
    try {
      const result = await this.jiraService.exportTasks(ctx.projectId, {
        scope: this.scope(),
        selectedTaskIds: this.scope() === 'Selected' ? ctx.selectedTaskIds : undefined,
        search: this.scope() === 'AllFiltered' ? ctx.search : undefined,
        columnId: this.scope() === 'AllFiltered' ? ctx.columnId : undefined,
        assigneeId: this.scope() === 'AllFiltered' ? ctx.assigneeId : undefined,
        unassigned: this.scope() === 'AllFiltered' ? ctx.unassigned : false,
        skipAlreadyExported: this.skipAlreadyExported(),
      });
      this.result.set(result);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.exporting.set(false);
    }
  }
}
