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
import { lucideDownload, lucideLoaderCircle } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCheckboxImports } from 'spartan/checkbox';
import { HlmDialogImports } from 'spartan/dialog';
import { HlmIconImports } from 'spartan/icon';
import { problemDetailMessage } from '../../http/problem-details';
import type {
  ImportTasksFromJiraResultDto,
  JiraIssuePreviewDto,
} from '../../models/integrations/jira.models';
import { JiraIntegrationsService } from '../../services/integrations/jira-integrations.service';

@Component({
  selector: 'app-import-from-jira-dialog',
  imports: [NgIcon, ...HlmButtonImports, ...HlmCheckboxImports, ...HlmDialogImports, ...HlmIconImports],
  providers: [provideIcons({ lucideDownload, lucideLoaderCircle })],
  templateUrl: './import-from-jira-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportFromJiraDialogComponent {
  private readonly jiraService = inject(JiraIntegrationsService);

  readonly state = model<'open' | 'closed'>('closed');
  readonly projectId = input<string | null>(null);
  readonly imported = model<boolean>(false);

  readonly loading = signal(false);
  readonly importing = signal(false);
  readonly error = signal<string | null>(null);
  readonly issues = signal<JiraIssuePreviewDto[]>([]);
  readonly selectedKeys = signal<string[]>([]);
  readonly skipAlreadyImported = signal(true);
  readonly result = signal<ImportTasksFromJiraResultDto | null>(null);

  readonly importableIssues = computed(() =>
    this.skipAlreadyImported()
      ? this.issues().filter((i) => !i.alreadyImported)
      : this.issues(),
  );

  readonly selectedCount = computed(() => this.selectedKeys().length);

  readonly allImportableSelected = computed(() => {
    const importable = this.importableIssues();
    if (importable.length === 0) {
      return false;
    }
    const selected = new Set(this.selectedKeys());
    return importable.every((i) => selected.has(i.key));
  });

  onStateChanged(next: 'open' | 'closed'): void {
    this.state.set(next);
    if (next === 'open') {
      this.error.set(null);
      this.result.set(null);
      this.selectedKeys.set([]);
      this.skipAlreadyImported.set(true);
      this.imported.set(false);
      void this.loadIssues();
    }
  }

  toggleSkip(checked: boolean): void {
    this.skipAlreadyImported.set(checked);
    if (checked) {
      const allowed = new Set(this.importableIssues().map((i) => i.key));
      this.selectedKeys.update((keys) => keys.filter((k) => allowed.has(k)));
    }
  }

  toggleIssue(key: string, checked: boolean): void {
    this.selectedKeys.update((keys) => {
      if (checked) {
        return keys.includes(key) ? keys : [...keys, key];
      }
      return keys.filter((k) => k !== key);
    });
  }

  toggleSelectAll(checked: boolean): void {
    if (!checked) {
      this.selectedKeys.set([]);
      return;
    }
    this.selectedKeys.set(this.importableIssues().map((i) => i.key));
  }

  isSelected(key: string): boolean {
    return this.selectedKeys().includes(key);
  }

  async importSelected(): Promise<void> {
    await this.runImport({ importAll: false, issueKeys: this.selectedKeys() });
  }

  async importAll(): Promise<void> {
    await this.runImport({ importAll: true });
  }

  private async loadIssues(): Promise<void> {
    const projectId = this.projectId();
    if (!projectId) {
      this.error.set('Project was not found.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    try {
      const issues = await this.jiraService.listRemoteIssues(projectId);
      this.issues.set(issues);
      this.selectedKeys.set(issues.filter((i) => !i.alreadyImported).map((i) => i.key));
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
      this.issues.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private async runImport(options: {
    importAll: boolean;
    issueKeys?: string[];
  }): Promise<void> {
    const projectId = this.projectId();
    if (!projectId || this.importing()) {
      return;
    }

    if (!options.importAll && (options.issueKeys?.length ?? 0) === 0) {
      this.error.set('Select at least one issue to import.');
      return;
    }

    this.importing.set(true);
    this.error.set(null);
    this.result.set(null);
    try {
      const result = await this.jiraService.importTasks(projectId, {
        importAll: options.importAll,
        issueKeys: options.issueKeys,
        skipAlreadyImported: this.skipAlreadyImported(),
      });
      this.result.set(result);
      if (result.imported > 0) {
        this.imported.set(true);
      }
      await this.loadIssues();
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.importing.set(false);
    }
  }
}
