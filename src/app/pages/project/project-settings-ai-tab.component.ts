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
import {
  aiAuthorIconSrc,
  groupAiModelsByProvider,
  type AiModelDto,
} from '../../models/ai-chat/ai-chat.models';
import type {
  ProjectSettingsDto,
  UpdateProjectSettingsRequest,
} from '../../models/projects/projects.models';
import { AiService } from '../../services/ai/ai.service';
import { ProjectsService } from '../../services/projects/projects.service';

const NONE_MODEL = '__none__';
const MIN_TEMPERATURE = 0;
const MAX_TEMPERATURE = 2;
const DEFAULT_TEMPERATURE = 0.2;

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
  readonly minTemperature = MIN_TEMPERATURE;
  readonly maxTemperature = MAX_TEMPERATURE;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly savedMessage = signal<string | null>(null);
  readonly models = signal<AiModelDto[]>([]);

  readonly defaultAiModelId = signal<string | null>(null);
  readonly enrichmentAiModelId = signal<string | null>(null);
  readonly temperature = signal(DEFAULT_TEMPERATURE);
  private initialDefaultAiModelId: string | null = null;
  private initialEnrichmentAiModelId: string | null = null;
  private initialTemperature = DEFAULT_TEMPERATURE;
  private projectId: string | null = null;

  readonly canSave = computed(() => {
    if (this.saving() || this.loading()) {
      return false;
    }
    const temperature = this.temperature();
    if (!this.isValidTemperature(temperature)) {
      return false;
    }
    return (
      this.defaultAiModelId() !== this.initialDefaultAiModelId ||
      this.enrichmentAiModelId() !== this.initialEnrichmentAiModelId ||
      temperature !== this.initialTemperature
    );
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

  readonly selectedEnrichmentModel = computed(() => {
    const id = this.enrichmentAiModelId();
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

  readonly enrichmentModelLabel = (value: unknown): string => {
    if (value === NONE_MODEL || value == null || value === '') {
      return 'Use default AI model';
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

  updateEnrichmentModel(value: unknown): void {
    const id =
      value === NONE_MODEL || value == null || value === '' ? null : String(value);
    this.enrichmentAiModelId.set(id);
    this.savedMessage.set(null);
  }

  updateTemperature(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    this.temperature.set(Number.isFinite(raw) ? raw : this.temperature());
    this.savedMessage.set(null);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    this.savedMessage.set(null);

    if (!this.projectId) {
      return;
    }

    const temperature = this.temperature();
    if (!this.isValidTemperature(temperature)) {
      this.error.set(`Temperature must be between ${MIN_TEMPERATURE} and ${MAX_TEMPERATURE}.`);
      return;
    }

    const selectedDefault = this.defaultAiModelId();
    const selectedEnrichment = this.enrichmentAiModelId();
    this.saving.set(true);
    try {
      const body: UpdateProjectSettingsRequest = {};

      if (selectedDefault) {
        body.defaultAiModelId = selectedDefault;
      } else if (this.initialDefaultAiModelId) {
        body.clearDefaultAiModel = true;
      }

      if (selectedEnrichment) {
        body.enrichmentAiModelId = selectedEnrichment;
      } else if (this.initialEnrichmentAiModelId) {
        body.clearEnrichmentAiModel = true;
      }

      if (temperature !== this.initialTemperature) {
        body.aiTemperature = temperature;
      }

      const updated = await this.projectsService.updateSettings(this.projectId, body);
      this.applySettings(updated);
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
    const defaultId = settings.defaultAiModelId ?? null;
    const enrichmentId = settings.enrichmentAiModelId ?? null;
    const temperature = this.clampTemperature(settings.aiTemperature ?? DEFAULT_TEMPERATURE);
    this.defaultAiModelId.set(defaultId);
    this.initialDefaultAiModelId = defaultId;
    this.enrichmentAiModelId.set(enrichmentId);
    this.initialEnrichmentAiModelId = enrichmentId;
    this.temperature.set(temperature);
    this.initialTemperature = temperature;
  }

  private clampTemperature(value: number): number {
    return Math.min(MAX_TEMPERATURE, Math.max(MIN_TEMPERATURE, value));
  }

  private isValidTemperature(value: number): boolean {
    return Number.isFinite(value) && value >= MIN_TEMPERATURE && value <= MAX_TEMPERATURE;
  }
}
