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
import { lucideCheck, lucideLoaderCircle } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputImports } from 'spartan/input';
import { HlmLabelImports } from 'spartan/label';
import { isTransientHttpFailure, problemDetailMessage } from '../../http/problem-details';
import type { ProjectSettingsDto } from '../../models/projects/projects.models';
import { ProjectsService } from '../../services/projects/projects.service';

@Component({
  selector: 'app-project-settings-ai-tab',
  imports: [
    NgIcon,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputImports,
    ...HlmLabelImports,
  ],
  providers: [provideIcons({ lucideCheck, lucideLoaderCircle })],
  templateUrl: './project-settings-ai-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectSettingsAiTabComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal<string | null>(null);
  readonly savedMessage = signal<string | null>(null);

  readonly model = signal({ maxTreeDepth: 2, maxNodes: 16 });
  private initial = { maxTreeDepth: 2, maxNodes: 16 };
  private projectId: string | null = null;

  readonly canSave = computed(() => {
    if (this.saving() || this.loading()) {
      return false;
    }
    const m = this.model();
    if (!this.isValidDepth(m.maxTreeDepth) || !this.isValidNodes(m.maxNodes)) {
      return false;
    }
    return m.maxTreeDepth !== this.initial.maxTreeDepth || m.maxNodes !== this.initial.maxNodes;
  });

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
      const updated = await this.projectsService.updateSettings(this.projectId, {
        aiMaxTreeDepth: m.maxTreeDepth,
        aiMaxNodes: m.maxNodes,
      });
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
      const settings = await this.projectsService.getSettings(project.id);
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
