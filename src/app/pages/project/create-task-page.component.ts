import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideClipboardList,
  lucideLoaderCircle,
  lucidePlus,
} from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputImports } from 'spartan/input';
import { HlmLabelImports } from 'spartan/label';
import { HlmSelectImports } from 'spartan/select';
import { problemDetailMessage } from '../../http/problem-details';
import type { ProjectUserDto } from '../../models/projects/projects.models';
import { projectSectionPath } from '../../routing/app-paths';
import { ProjectsService } from '../../services/projects/projects.service';

@Component({
  selector: 'app-create-task-page',
  imports: [
    RouterLink,
    NgIcon,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
  ],
  providers: [
    provideIcons({
      lucideArrowLeft,
      lucideClipboardList,
      lucideLoaderCircle,
      lucidePlus,
    }),
  ],
  templateUrl: './create-task-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTaskPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly users = signal<ProjectUserDto[]>([]);
  readonly boardLink = signal<string[]>(['/']);

  readonly model = signal({
    title: '',
    description: '',
    assigneeId: null as string | null,
  });

  readonly canSubmit = computed(() => {
    const value = this.model();
    return !this.saving() && value.title.trim().length > 0;
  });

  private projectId: string | null = null;
  private projectCode = '';

  ngOnInit(): void {
    void this.loadPage();
  }

  updateField(field: 'title' | 'description', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.model.update((current) => ({ ...current, [field]: value }));
  }

  onAssigneeChange(value: string | null): void {
    this.model.update((current) => ({ ...current, assigneeId: value }));
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitted.set(true);

    const value = this.model();
    if (!this.projectId || !this.canSubmit()) {
      return;
    }

    this.saving.set(true);
    this.formError.set(null);
    try {
      await this.projectsService.createTask(this.projectId, {
        title: value.title.trim(),
        description: value.description.trim() || null,
        assigneeId: value.assigneeId,
      });
      await this.router.navigate(projectSectionPath(this.projectCode, 'board'));
    } catch (err) {
      this.formError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.saving.set(false);
    }
  }

  userLabel(user: ProjectUserDto): string {
    const name = `${user.firstName} ${user.lastName}`.trim();
    return name || user.email;
  }

  assigneeLabel = (assigneeId: string | null): string => {
    if (!assigneeId) {
      return 'Unassigned';
    }

    const user = this.users().find((entry) => entry.id === assigneeId);
    return user ? this.userLabel(user) : '';
  };

  private async loadPage(): Promise<void> {
    const code = this.route.parent?.snapshot.paramMap.get('projectCode')?.trim().toUpperCase() ?? '';
    if (!code) {
      this.loading.set(false);
      this.formError.set('Project was not found.');
      return;
    }

    this.projectCode = code;
    this.boardLink.set(projectSectionPath(code, 'board'));
    this.loading.set(true);
    this.formError.set(null);

    try {
      const project = await this.projectsService.getByCode(code);
      if (!project) {
        this.formError.set('Project was not found.');
        return;
      }

      this.projectId = project.id;
      const usersPage = await this.projectsService.listUsers(project.id, undefined, 1, 100);
      this.users.set(usersPage.items);
    } catch (err) {
      this.formError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.loading.set(false);
    }
  }
}
