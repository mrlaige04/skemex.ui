import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLink2, lucideRefreshCw, lucideUnlink } from '@ng-icons/lucide';
import { HlmBadgeImports } from 'spartan/badge';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputImports } from 'spartan/input';
import { HlmSelectImports } from 'spartan/select';
import { HlmTabsImports } from 'spartan/tabs';
import { problemDetailMessage } from '../../../../http/problem-details';
import type {
  JiraEntityMappingWorkspaceDto,
  JiraMappingLocalEntityType,
  JiraMappingLocalItemDto,
  JiraMappingRemoteItemDto,
} from '../../../../models/integrations/jira.models';
import { APP_PATHS } from '../../../../routing/app-paths';
import { findRouteParam } from '../../../../routing/find-route-param';
import { JiraIntegrationsService } from '../../../../services/integrations/jira-integrations.service';
import { ProjectsService } from '../../../../services/projects/projects.service';

type MappingTab = {
  id: JiraMappingLocalEntityType;
  label: string;
  hint: string;
  allowCustomExternalId: boolean;
};

const TABS: MappingTab[] = [
  {
    id: 'Task',
    label: 'Tasks',
    hint: 'Map Skemex tasks to Jira issues.',
    allowCustomExternalId: false,
  },
  {
    id: 'ProjectUser',
    label: 'Users',
    hint: 'Map project members to Jira accounts.',
    allowCustomExternalId: false,
  },
  {
    id: 'TaskComment',
    label: 'Comments',
    hint: 'Map task comments to Jira comments (from mapped issues).',
    allowCustomExternalId: true,
  },
  {
    id: 'TaskWorkLog',
    label: 'Work logs',
    hint: 'Map work logs to Jira worklogs. Enter a Jira worklog id when needed.',
    allowCustomExternalId: true,
  },
  {
    id: 'TaskAttachment',
    label: 'Attachments',
    hint: 'Map attachments to Jira attachment ids.',
    allowCustomExternalId: true,
  },
];

@Component({
  selector: 'app-jira-mappings-page',
  imports: [
    FormsModule,
    NgTemplateOutlet,
    NgIcon,
    RouterLink,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputImports,
    ...HlmSelectImports,
    ...HlmTabsImports,
  ],
  providers: [provideIcons({ lucideLink2, lucideRefreshCw, lucideUnlink })],
  templateUrl: './jira-mappings-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0 overflow-y-auto' },
})
export class JiraMappingsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);
  private readonly jiraService = inject(JiraIntegrationsService);

  readonly tabs = TABS;
  readonly activeTab = signal<JiraMappingLocalEntityType>('Task');
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly savingLocalId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly projectId = signal('');
  readonly projectCode = signal('');
  readonly workspace = signal<JiraEntityMappingWorkspaceDto | null>(null);
  /** Pending remote selection per local entity id. */
  readonly draftRemoteId = signal<Record<string, string>>({});
  /** Manual external id overrides (for child entity types). */
  readonly draftCustomId = signal<Record<string, string>>({});

  readonly settingsLink = computed(() => {
    const code = this.projectCode();
    return code ? APP_PATHS.projectSettings(code) : APP_PATHS.projects;
  });

  readonly activeTabMeta = computed(
    () => this.tabs.find((t) => t.id === this.activeTab()) ?? this.tabs[0],
  );

  readonly filteredLocals = computed(() => {
    const items = this.workspace()?.localItems ?? [];
    const q = this.search().trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter((item) => {
      const hay = [
        item.displayName,
        item.secondaryText,
        item.parentTaskCode,
        item.mapping?.externalEntityKey,
        item.mapping?.externalEntityId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  });

  readonly mappedCount = computed(
    () => (this.workspace()?.localItems ?? []).filter((i) => !!i.mapping).length,
  );

  ngOnInit(): void {
    void this.bootstrap();
  }

  async onTabActivated(tab: string | number): Promise<void> {
    const tabId = String(tab);
    const match = this.tabs.find((t) => t.id === tabId);
    if (!match || match.id === this.activeTab()) {
      return;
    }
    this.activeTab.set(match.id);
    this.search.set('');
    this.draftRemoteId.set({});
    this.draftCustomId.set({});
    await this.loadWorkspace();
  }

  refresh(): void {
    void this.loadWorkspace(true);
  }

  remoteOptionsFor(local: JiraMappingLocalItemDto): JiraMappingRemoteItemDto[] {
    const remotes = this.workspace()?.remoteItems ?? [];
    return remotes.filter(
      (r) => !r.mappedLocalEntityId || r.mappedLocalEntityId === local.id,
    );
  }

  selectedRemoteId(local: JiraMappingLocalItemDto): string {
    const draft = this.draftRemoteId()[local.id];
    if (draft !== undefined) {
      return draft;
    }
    return local.mapping?.externalEntityId ?? '';
  }

  onRemoteChange(localId: string, value: string | null | undefined): void {
    this.draftRemoteId.update((prev) => ({ ...prev, [localId]: value ?? '' }));
  }

  customId(localId: string): string {
    return this.draftCustomId()[localId] ?? '';
  }

  onCustomIdChange(localId: string, value: string): void {
    this.draftCustomId.update((prev) => ({ ...prev, [localId]: value }));
  }

  remoteLabel = (id: string): string => {
    const remote = this.workspace()?.remoteItems.find((r) => r.id === id);
    return remote?.displayName ?? id;
  };

  statusVariant(status: string | undefined | null): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (status === 'Outdated') {
      return 'destructive';
    }
    if (status === 'Active') {
      return 'default';
    }
    return 'secondary';
  }

  async saveMapping(local: JiraMappingLocalItemDto): Promise<void> {
    const projectId = this.projectId();
    if (!projectId) {
      return;
    }

    const allowCustom = this.activeTabMeta().allowCustomExternalId;
    const custom = this.customId(local.id).trim();
    const selected = this.selectedRemoteId(local).trim();
    const externalEntityId = allowCustom && custom ? custom : selected;
    if (!externalEntityId) {
      this.error.set('Select a Jira entity (or enter an id) before saving.');
      return;
    }

    const remote = (this.workspace()?.remoteItems ?? []).find((r) => r.id === externalEntityId);
    this.savingLocalId.set(local.id);
    this.error.set(null);
    try {
      await this.jiraService.upsertEntityMapping(projectId, {
        localEntityType: this.activeTab(),
        localEntityId: local.id,
        externalEntityId,
        externalEntityKey: remote?.key ?? externalEntityId,
        status: 'Active',
      });
      await this.loadWorkspace();
    } catch (err) {
      this.error.set(this.toErrorMessage(err));
    } finally {
      this.savingLocalId.set(null);
    }
  }

  async clearMapping(local: JiraMappingLocalItemDto): Promise<void> {
    const projectId = this.projectId();
    const mappingId = local.mapping?.id;
    if (!projectId || !mappingId) {
      return;
    }

    this.savingLocalId.set(local.id);
    this.error.set(null);
    try {
      await this.jiraService.deleteEntityMapping(projectId, mappingId);
      this.draftRemoteId.update((prev) => {
        const next = { ...prev };
        delete next[local.id];
        return next;
      });
      this.draftCustomId.update((prev) => {
        const next = { ...prev };
        delete next[local.id];
        return next;
      });
      await this.loadWorkspace();
    } catch (err) {
      this.error.set(this.toErrorMessage(err));
    } finally {
      this.savingLocalId.set(null);
    }
  }

  private async bootstrap(): Promise<void> {
    const code = findRouteParam(this.route, 'projectCode')?.trim() ?? '';
    this.projectCode.set(code);
    if (!code) {
      this.loading.set(false);
      this.error.set('Project was not found.');
      return;
    }

    try {
      const project = await this.projectsService.getByCode(code);
      if (!project) {
        this.error.set('Project was not found.');
        this.loading.set(false);
        return;
      }
      this.projectId.set(project.id);
      await this.loadWorkspace();
    } catch (err) {
      this.error.set(this.toErrorMessage(err));
      this.loading.set(false);
    }
  }

  private async loadWorkspace(isRefresh = false): Promise<void> {
    const projectId = this.projectId();
    if (!projectId) {
      return;
    }

    if (isRefresh) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set(null);

    try {
      const workspace = await this.jiraService.getEntityMappings(projectId, this.activeTab());
      this.workspace.set(workspace);
      const drafts: Record<string, string> = {};
      for (const item of workspace.localItems) {
        if (item.mapping?.externalEntityId) {
          drafts[item.id] = item.mapping.externalEntityId;
        }
      }
      this.draftRemoteId.set(drafts);
      this.draftCustomId.set({});
    } catch (err) {
      this.workspace.set(null);
      this.error.set(this.toErrorMessage(err));
    } finally {
      this.loading.set(false);
      this.refreshing.set(false);
    }
  }

  private toErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      return problemDetailMessage(err) ?? err.message;
    }
    return err instanceof Error ? err.message : 'Something went wrong.';
  }
}
