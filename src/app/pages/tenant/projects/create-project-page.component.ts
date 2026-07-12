import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideFolderKanban,
  lucideHash,
  lucideImagePlus,
  lucideLoaderCircle,
  lucidePlus,
} from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmLabelImports } from 'spartan/label';
import { problemDetailMessage } from '../../../http/problem-details';
import { APP_PATHS } from '../../../routing/app-paths';
import { ProjectsService } from '../../../services/projects/projects.service';

type ProjectFormField = 'name' | 'description';

@Component({
  selector: 'app-create-project-page',
  imports: [
    RouterLink,
    NgIcon,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
  ],
  providers: [
    provideIcons({
      lucideArrowLeft,
      lucideFolderKanban,
      lucideHash,
      lucideImagePlus,
      lucideLoaderCircle,
      lucidePlus,
    }),
  ],
  templateUrl: './create-project-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateProjectPageComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly projectsListLink = signal<string[]>([APP_PATHS.projects]);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly logoFile = signal<File | null>(null);
  readonly logoPreviewUrl = signal<string | null>(null);
  readonly logoPreviewFailed = signal(false);

  readonly model = signal({
    name: '',
    code: '',
    description: '',
  });

  readonly canSubmit = computed(() => {
    const m = this.model();
    return !this.saving() && m.name.trim().length > 0 && m.code.trim().length > 0;
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearLogoPreview();
    });
  }

  updateField(field: ProjectFormField, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.model.update((m) => ({ ...m, [field]: value }));
  }

  updateCode(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toUpperCase();
    this.model.update((m) => ({ ...m, code: value }));
  }

  onLogoPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.clearLogoPreview();
    this.logoFile.set(file);
    this.logoPreviewFailed.set(false);

    if (file) {
      this.logoPreviewUrl.set(URL.createObjectURL(file));
    }
  }

  onLogoPreviewError(): void {
    this.logoPreviewFailed.set(true);
  }

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.createProject();
  }

  private clearLogoPreview(): void {
    const current = this.logoPreviewUrl();
    if (current) {
      URL.revokeObjectURL(current);
    }
    this.logoPreviewUrl.set(null);
  }

  private async createProject(): Promise<void> {
    this.submitted.set(true);
    this.formError.set(null);

    if (!this.canSubmit()) {
      return;
    }

    const m = this.model();
    this.saving.set(true);
    try {
      await this.projectsService.create({
        name: m.name.trim(),
        code: m.code.trim(),
        description: m.description.trim() || null,
        logo: this.logoFile(),
      });
      await this.router.navigate(this.projectsListLink());
    } catch (err) {
      this.formError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.saving.set(false);
    }
  }
}
