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
import { lucideBot, lucideCheck, lucideLoaderCircle } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmLabelImports } from 'spartan/label';
import { HlmSelectImports } from 'spartan/select';
import { isTransientHttpFailure, problemDetailMessage } from '../../http/problem-details';
import {
  aiAuthorIconSrc,
  groupAiModelsByProvider,
  type AiModelDto,
} from '../../models/ai-chat/ai-chat.models';
import type { ProjectSettingsDto } from '../../models/projects/projects.models';
import { AiService } from '../../services/ai/ai.service';
import { ProjectsService } from '../../services/projects/projects.service';

const NONE_MODEL = '__none__';

@Component({
  selector: 'app-project-settings-ai-tab',
  imports: [
    NgIcon,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
  ],
  providers: [provideIcons({ lucideBot, lucideCheck, lucideLoaderCircle })],
  templateUrl: './project-settings-ai-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectSettingsAiTabComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);
  private readonly aiService = inject(AiService);

  readonly noneModelValue = NONE_MODEL;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly savedMessage = signal<string | null>(null);
  readonly models = signal<AiModelDto[]>([]);

  readonly defaultAiModelId = signal<string | null>(null);
  private initialDefaultAiModelId: string | null = null;
  private projectId: string | null = null;

  readonly canSave = computed(() => {
    if (this.saving() || this.loading()) {
      return false;
    }
    return this.defaultAiModelId() !== this.initialDefaultAiModelId;
  });

  readonly modelsByProvider = computed(() => groupAiModelsByProvider(this.models()));
  readonly authorIconSrc = aiAuthorIconSrc;

  readonly selectedDefaultModel = computed(() => {
    const id = this.defaultAiModelId();
    if (!id) {
      return null;
    }
    return this.models().find((m) => m.id === id) ?? null;
  });

  modelById(value: unknown) {
    if (value === NONE_MODEL || value == null || value === '') {
      return null;
    }
    const id = String(value);
    return this.models().find((m) => m.id === id) ?? null;
  }

  readonly modelLabel = (value: unknown): string => {
    if (value === NONE_MODEL || value == null || value === '') {
      return 'No default';
    }
    return this.modelById(value)?.displayName ?? String(value);
  };

  ngOnInit(): void {
    void this.load();
  }

  updateDefaultModel(value: unknown): void {
    const id =
      value === NONE_MODEL || value == null || value === '' ? null : String(value);
    this.defaultAiModelId.set(id);
    this.savedMessage.set(null);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    this.savedMessage.set(null);

    if (!this.projectId) {
      return;
    }

    const selected = this.defaultAiModelId();
    this.saving.set(true);
    try {
      const body: {
        defaultAiModelId?: string;
        clearDefaultAiModel?: boolean;
      } = {};

      if (selected) {
        body.defaultAiModelId = selected;
      } else if (this.initialDefaultAiModelId) {
        body.clearDefaultAiModel = true;
      }

      const updated = await this.projectsService.updateSettings(this.projectId, body);
      this.applySettings(updated);
      this.savedMessage.set('Default AI model saved.');
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.saving.set(false);
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
        this.projectId = null;
        return;
      }

      this.projectId = project.id;
      const [settings, models] = await Promise.all([
        this.projectsService.getSettings(project.id),
        this.aiService.listAiModels(),
      ]);
      this.models.set(models.filter((m) => m.isActive));
      this.applySettings(settings);
    } catch (err) {
      if (!isTransientHttpFailure(err)) {
        this.error.set(problemDetailMessage(err as HttpErrorResponse));
      }
    } finally {
      this.loading.set(false);
    }
  }

  private applySettings(settings: ProjectSettingsDto): void {
    const id = settings.defaultAiModelId ?? null;
    this.defaultAiModelId.set(id);
    this.initialDefaultAiModelId = id;
  }
}
