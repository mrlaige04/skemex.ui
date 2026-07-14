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
  lucideFolderKanban,
  lucideHash,
  lucideLoaderCircle,
} from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmLabelImports } from 'spartan/label';
import { problemDetailMessage } from '../../http/problem-details';
import { ProjectsService } from '../../services/projects/projects.service';

type MainInfoField = 'name' | 'description';

@Component({
  selector: 'app-project-settings-main-info-tab',
  imports: [
    NgIcon,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
  ],
  providers: [
    provideIcons({
      lucideCheck,
      lucideFolderKanban,
      lucideHash,
      lucideLoaderCircle,
    }),
  ],
  templateUrl: './project-settings-main-info-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectSettingsMainInfoTabComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly formError = signal<string | null>(null);
  readonly savedMessage = signal<string | null>(null);

  readonly model = signal({
    name: '',
    code: '',
    description: '',
  });

  private projectId: string | null = null;
  private initial = { name: '', description: '' };

  readonly canSave = computed(() => {
    const m = this.model();
    const name = m.name.trim();
    if (this.saving() || !name) {
      return false;
    }
    return (
      name !== this.initial.name ||
      (m.description.trim() || '') !== this.initial.description
    );
  });

  ngOnInit(): void {
    void this.loadProject();
  }

  updateField(field: MainInfoField, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.model.update((m) => ({ ...m, [field]: value }));
    this.savedMessage.set(null);
  }

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.save();
  }

  private async loadProject(): Promise<void> {
    const code = this.route.parent?.snapshot.paramMap.get('projectCode')?.trim() ?? '';
    if (!code) {
      this.loading.set(false);
      this.formError.set('Project was not found.');
      return;
    }

    this.loading.set(true);
    this.formError.set(null);
    try {
      const project = await this.projectsService.getByCode(code);
      if (!project) {
        this.formError.set('Project was not found.');
        this.projectId = null;
        return;
      }

      this.projectId = project.id;
      const name = project.name;
      const description = project.description ?? '';
      this.initial = { name, description };
      this.model.set({
        name,
        code: project.code,
        description,
      });
    } catch (err) {
      this.formError.set(problemDetailMessage(err as HttpErrorResponse));
      this.projectId = null;
    } finally {
      this.loading.set(false);
    }
  }

  private async save(): Promise<void> {
    this.submitted.set(true);
    this.savedMessage.set(null);

    if (!this.projectId) {
      this.formError.set('Project was not found.');
      return;
    }

    const name = this.model().name.trim();
    if (!name) {
      return;
    }

    this.saving.set(true);
    this.formError.set(null);
    try {
      const description = this.model().description.trim();
      const updated = await this.projectsService.update(this.projectId, {
        name,
        description: description.length > 0 ? description : null,
      });
      this.initial = {
        name: updated.name,
        description: updated.description ?? '',
      };
      this.model.update((m) => ({
        ...m,
        name: updated.name,
        code: updated.code,
        description: updated.description ?? '',
      }));
      this.savedMessage.set('Project info saved.');
      this.submitted.set(false);
    } catch (err) {
      this.formError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.saving.set(false);
    }
  }
}
