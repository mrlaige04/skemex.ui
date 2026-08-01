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
import { HlmInputImports } from 'spartan/input';
import { HlmLabelImports } from 'spartan/label';
import { HlmSelectImports } from 'spartan/select';
import { isTransientHttpFailure, problemDetailMessage } from '../../http/problem-details';
import { groupAiModelsByProvider, aiAuthorIconSrc, type AiModelDto } from '../../models/ai-chat/ai-chat.models';
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
    ...HlmInputImports,
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
  readonly submitted = signal(false);
  readonly error = signal<string | null>(null);
  readonly savedMessage = signal<string | null>(null);
  readonly models = signal<AiModelDto[]>([]);

  readonly model = signal({
    maxTreeDepth: 2,
    maxNodes: 16,
    defaultAiModelId: null as string | null,
  });
  private initial = {
    maxTreeDepth: 2,
    maxNodes: 16,
    defaultAiModelId: null as string | null,
  };
  private projectId: string | null = null;

  readonly canSave = computed(() => {
    if (this.saving() || this.loading()) {
      return false;
    }
    const m = this.model();
    if (!this.isValidDepth(m.maxTreeDepth) || !this.isValidNodes(m.maxNodes)) {
      return false;
    }
    return (
      m.maxTreeDepth !== this.initial.maxTreeDepth ||
      m.maxNodes !== this.initial.maxNodes ||
      m.defaultAiModelId !== this.initial.defaultAiModelId
    );
  });

  readonly modelsByProvider = computed(() => groupAiModelsByProvider(this.models()));
  readonly authorIconSrc = aiAuthorIconSrc;

  readonly selectedDefaultModel = computed(() => {
    const id = this.model().defaultAiModelId;
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

  updateDepth(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.model.update((m) => ({ ...m, maxTreeDepth: Number.isFinite(value) ? value : m.maxTreeDepth }));
    this.savedMessage.set(null);
  }

  updateNodes(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.model.update((m) => ({ ...m, maxNodes: Number.isFinite(value) ? value : m.maxNodes }));
    this.savedMessage.set(null);
  }

  updateDefaultModel(value: unknown): void {
    const id =
      value === NONE_MODEL || value == null || value === '' ? null : String(value);
    this.model.update((m) => ({ ...m, defaultAiModelId: id }));
    this.savedMessage.set(null);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitted.set(true);
    this.error.set(null);
    this.savedMessage.set(null);

    const m = this.model();
    if (!this.projectId || !this.isValidDepth(m.maxTreeDepth) || !this.isValidNodes(m.maxNodes)) {
      return;
    }

    this.saving.set(true);
    try {
      const body: {
        aiMaxTreeDepth: number;
        aiMaxNodes: number;
        defaultAiModelId?: string;
        clearDefaultAiModel?: boolean;
      } = {
        aiMaxTreeDepth: m.maxTreeDepth,
        aiMaxNodes: m.maxNodes,
      };

      if (m.defaultAiModelId) {
        body.defaultAiModelId = m.defaultAiModelId;
      } else if (this.initial.defaultAiModelId) {
        body.clearDefaultAiModel = true;
      }

      const updated = await this.projectsService.updateSettings(this.projectId, body);
      this.applySettings(updated);
      this.submitted.set(false);
      this.savedMessage.set('AI settings saved.');
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
    const next = {
      maxTreeDepth: settings.aiMaxTreeDepth,
      maxNodes: settings.aiMaxNodes,
      defaultAiModelId: settings.defaultAiModelId ?? null,
    };
    this.model.set(next);
    this.initial = { ...next };
  }

  private isValidDepth(value: number): boolean {
    return Number.isInteger(value) && value >= 1 && value <= 8;
  }

  private isValidNodes(value: number): boolean {
    return Number.isInteger(value) && value >= 1 && value <= 64;
  }
}
