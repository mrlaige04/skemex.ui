import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideExternalLink,
  lucideLink2,
  lucideLoaderCircle,
  lucideUnplug,
} from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmLabelImports } from 'spartan/label';
import { HlmSelectImports } from 'spartan/select';
import { isTransientHttpFailure, problemDetailMessage } from '../../http/problem-details';
import type {
  JiraAccessibleResourceDto,
  JiraConnectionDto,
  JiraProjectDto,
} from '../../models/integrations/jira.models';
import { PERMISSIONS } from '../../models/auth/permissions';
import { JiraIntegrationsService } from '../../services/integrations/jira-integrations.service';
import { ProjectsService } from '../../services/projects/projects.service';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-project-settings-integrations-tab',
  imports: [
    NgIcon,
    HasPermissionDirective,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
  ],
  providers: [
    provideIcons({
      lucideCheck,
      lucideExternalLink,
      lucideLink2,
      lucideLoaderCircle,
      lucideUnplug,
    }),
  ],
  templateUrl: './project-settings-integrations-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectSettingsIntegrationsTabComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);
  private readonly jiraService = inject(JiraIntegrationsService);

  readonly permissions = PERMISSIONS;

  readonly loading = signal(true);
  readonly connecting = signal(false);
  readonly savingMapping = signal(false);
  readonly disconnecting = signal(false);
  readonly loadingProjects = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);

  readonly connection = signal<JiraConnectionDto | null>(null);
  readonly sites = signal<JiraAccessibleResourceDto[]>([]);
  readonly jiraProjects = signal<JiraProjectDto[]>([]);

  readonly selectedCloudId = signal<string | null>(null);
  readonly selectedProjectId = signal<string | null>(null);

  private projectId: string | null = null;

  readonly needsMapping = computed(() => {
    const c = this.connection();
    return !!c && c.status === 'PendingProjectMapping';
  });

  readonly isConnected = computed(() => {
    const c = this.connection();
    return !!c && c.status === 'Connected';
  });

  readonly selectedSite = computed(() => {
    const id = this.selectedCloudId();
    if (!id) {
      return null;
    }
    return this.sites().find((s) => s.id === id) ?? null;
  });

  readonly selectedJiraProject = computed(() => {
    const id = this.selectedProjectId();
    if (!id) {
      return null;
    }
    return this.jiraProjects().find((p) => p.id === id) ?? null;
  });

  readonly canSaveMapping = computed(() => {
    return (
      !!this.selectedCloudId() &&
      !!this.selectedProjectId() &&
      !this.savingMapping() &&
      !this.loadingProjects()
    );
  });

  siteLabel = (value: unknown): string => {
    if (value == null || value === '') {
      return 'Select a Jira site';
    }
    const site = this.sites().find((s) => s.id === value);
    return site?.name ?? String(value);
  };

  projectLabel = (value: unknown): string => {
    if (value == null || value === '') {
      return 'Select a Jira project';
    }
    const project = this.jiraProjects().find((p) => p.id === value);
    return project ? `${project.key} — ${project.name}` : String(value);
  };

  ngOnInit(): void {
    this.readCallbackQuery();
    void this.load();
  }

  async connectJira(): Promise<void> {
    if (!this.projectId || this.connecting()) {
      return;
    }

    this.connecting.set(true);
    this.error.set(null);
    this.info.set(null);
    try {
      const start = await this.jiraService.startConnect(this.projectId);
      window.location.assign(start.authorizationUrl);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
      this.connecting.set(false);
    }
  }

  onSiteChange(value: unknown): void {
    const cloudId = typeof value === 'string' ? value : null;
    this.selectedCloudId.set(cloudId);
    this.selectedProjectId.set(null);
    this.jiraProjects.set([]);
    if (cloudId) {
      void this.loadJiraProjects(cloudId);
    }
  }

  onProjectChange(value: unknown): void {
    this.selectedProjectId.set(typeof value === 'string' ? value : null);
  }

  async saveMapping(): Promise<void> {
    if (!this.projectId || !this.canSaveMapping()) {
      return;
    }

    const site = this.selectedSite();
    const project = this.selectedJiraProject();
    if (!site || !project) {
      return;
    }

    this.savingMapping.set(true);
    this.error.set(null);
    this.info.set(null);
    try {
      const updated = await this.jiraService.mapProject(this.projectId, {
        cloudId: site.id,
        siteUrl: site.url,
        siteName: site.name,
        externalProjectId: project.id,
        externalProjectKey: project.key,
        externalProjectName: project.name,
      });
      this.connection.set(updated);
      this.info.set(`Linked to Jira project ${updated.externalProjectKey}.`);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.savingMapping.set(false);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.projectId || this.disconnecting()) {
      return;
    }

    this.disconnecting.set(true);
    this.error.set(null);
    this.info.set(null);
    try {
      await this.jiraService.disconnect(this.projectId);
      this.connection.set(null);
      this.sites.set([]);
      this.jiraProjects.set([]);
      this.selectedCloudId.set(null);
      this.selectedProjectId.set(null);
      this.info.set('Jira integration disconnected.');
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.disconnecting.set(false);
    }
  }

  private readCallbackQuery(): void {
    const params = this.route.snapshot.queryParamMap;
    const jira = params.get('jira')?.trim().toLowerCase();
    const message = params.get('jiraMessage')?.trim();
    if (jira === 'connected') {
      this.info.set('Jira authorized. Select a Jira project to finish setup.');
    } else if (jira === 'error') {
      this.error.set(message || 'Jira authorization failed.');
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const projectCode = this.route.parent?.snapshot.paramMap.get('projectCode')?.trim();
      if (!projectCode) {
        this.error.set('Project was not found.');
        return;
      }

      const project = await this.projectsService.getByCode(projectCode);
      if (!project) {
        this.error.set('Project was not found.');
        return;
      }

      this.projectId = project.id;
      const connection = await this.jiraService.getConnection(project.id);
      this.connection.set(connection);

      if (connection && connection.status !== 'Disconnected') {
        await this.loadSitesAndProjects(connection);
      }
    } catch (err) {
      if (!isTransientHttpFailure(err)) {
        this.error.set(problemDetailMessage(err as HttpErrorResponse));
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async loadSitesAndProjects(connection: JiraConnectionDto): Promise<void> {
    if (!this.projectId) {
      return;
    }

    try {
      const sites = await this.jiraService.listSites(this.projectId);
      this.sites.set(sites);
      const cloudId = connection.cloudId ?? sites[0]?.id ?? null;
      this.selectedCloudId.set(cloudId);
      if (cloudId) {
        await this.loadJiraProjects(cloudId);
        if (connection.externalProjectId) {
          this.selectedProjectId.set(connection.externalProjectId);
        }
      }
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    }
  }

  private async loadJiraProjects(cloudId: string): Promise<void> {
    if (!this.projectId) {
      return;
    }

    this.loadingProjects.set(true);
    try {
      const projects = await this.jiraService.listProjects(this.projectId, cloudId);
      this.jiraProjects.set(projects);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
      this.jiraProjects.set([]);
    } finally {
      this.loadingProjects.set(false);
    }
  }
}
