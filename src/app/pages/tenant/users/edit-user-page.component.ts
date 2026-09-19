import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { form, required, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideFolderKanban, lucideMail, lucideUser } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmComboboxImports } from 'spartan/combobox';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmItemImports } from 'spartan/item';
import { HlmLabelImports } from 'spartan/label';
import { HlmSelectImports } from 'spartan/select';
import { problemDetailMessage } from '../../../http/problem-details';
import type { TenantSpecializationDto } from '../../../models/tenant-specializations/tenant-specializations.models';
import type { TenantRoleDto } from '../../../models/users/users.models';
import { APP_PATHS } from '../../../routing/app-paths';
import { TenantSpecializationsService } from '../../../services/tenant-specializations/tenant-specializations.service';
import { UsersService } from '../../../services/users/users.service';
import { TaskTagsInputComponent } from '../../../shared/task-tags-input/task-tags-input.component';

@Component({
  selector: 'app-edit-user-page',
  imports: [
    RouterLink,
    NgIcon,
    TaskTagsInputComponent,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmComboboxImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
    ...HlmItemImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideMail, lucideUser, lucideFolderKanban })],
  templateUrl: './edit-user-page.component.html',
  styleUrl: './edit-user-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditUserPageComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly specializationsService = inject(TenantSpecializationsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly roles = signal<TenantRoleDto[]>([]);
  readonly catalog = signal<TenantSpecializationDto[]>([]);
  readonly usersListLink = signal<string[]>([]);
  readonly pageTitle = signal('Edit user');
  readonly userEmail = signal('');
  readonly firstName = signal('');
  readonly lastName = signal('');
  readonly skills = signal<string[]>([]);
  readonly selectedSpecializations = signal<TenantSpecializationDto[]>([]);
  private initialSpecializationIds: string[] = [];

  /** Placeholder until project membership API is wired up. */
  readonly placeholderProjects = [
    { id: '1', name: 'Customer onboarding automation', role: 'Editor' },
    { id: '2', name: 'Support ticket routing', role: 'Viewer' },
    { id: '3', name: 'Sales lead enrichment', role: 'Editor' },
  ] as const;

  private readonly userId = this.route.snapshot.paramMap.get('userId') ?? '';

  readonly model = signal({
    roleName: 'User',
  });

  readonly userForm = form(this.model, (f) => {
    required(f.roleName);
  });

  readonly specializationToString = (item: TenantSpecializationDto): string => item.title;

  specializationEqual(
    itemValue: TenantSpecializationDto,
    selectedValue: TenantSpecializationDto | null,
  ): boolean {
    return selectedValue !== null && itemValue.id === selectedValue.id;
  }

  ngOnInit(): void {
    this.usersListLink.set([APP_PATHS.users]);

    if (!this.userId) {
      this.loadError.set('User id is missing.');
      this.loading.set(false);
      return;
    }

    void this.loadRoles();
    void this.loadPage();
  }

  onRoleChange(value: string | null): void {
    this.model.update((m) => ({ ...m, roleName: value ?? 'User' }));
  }

  onSkillsChange(skills: string[]): void {
    this.skills.set(skills);
  }

  onSpecializationsChange(values: TenantSpecializationDto[] | null): void {
    const next = values ?? [];
    const previousIds = new Set(this.selectedSpecializations().map((item) => item.id));
    for (const item of next) {
      if (!previousIds.has(item.id)) {
        this.mergeSkills(item.defaultSkills ?? []);
      }
    }
    this.selectedSpecializations.set(next);
  }

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.commit();
  }

  private mergeSkills(defaults: string[]): void {
    const existing = new Set(this.skills().map((skill) => skill.toLowerCase()));
    const next = [...this.skills()];
    for (const skill of defaults) {
      const trimmed = skill.trim();
      if (!trimmed || existing.has(trimmed.toLowerCase())) {
        continue;
      }
      existing.add(trimmed.toLowerCase());
      next.push(trimmed);
    }
    this.skills.set(next);
  }

  private async loadRoles(): Promise<void> {
    try {
      this.roles.set(await this.usersService.roles());
    } catch {
      this.roles.set([
        { id: '', name: 'User' },
        { id: '', name: 'Admin' },
      ]);
    }
  }

  private async loadPage(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const [user, catalog] = await Promise.all([
        this.usersService.get(this.userId),
        this.specializationsService.list().catch(() => [] as TenantSpecializationDto[]),
      ]);

      const name = `${user.firstName} ${user.lastName}`.trim();
      this.pageTitle.set(name ? `Edit ${name}` : 'Edit user');
      this.userEmail.set(user.email);
      this.firstName.set(user.firstName);
      this.lastName.set(user.lastName);
      this.skills.set([...(user.skills ?? [])]);
      this.catalog.set(catalog);

      const catalogById = new Map(catalog.map((item) => [item.id, item]));
      const assigned = (user.specializations ?? [])
        .map((summary) => catalogById.get(summary.id) ?? {
          id: summary.id,
          title: summary.title,
          description: summary.description,
          defaultSkills: [],
        })
        .sort((left, right) => left.title.localeCompare(right.title));

      this.initialSpecializationIds = assigned.map((item) => item.id);
      this.selectedSpecializations.set(assigned);

      this.model.set({
        roleName: user.roles[0] ?? 'User',
      });
    } catch (err) {
      this.loadError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.loading.set(false);
    }
  }

  private async commit(): Promise<void> {
    this.saving.set(true);
    try {
      await submit(this.userForm, async (field) => {
        try {
          const m = field().value();
          await this.syncSpecializations();
          await this.usersService.update(this.userId, {
            roleName: m.roleName,
            skills: this.skills(),
          });
          await this.router.navigate(this.usersListLink());
          return;
        } catch (err) {
          const message =
            err instanceof HttpErrorResponse ? problemDetailMessage(err) : 'Could not update user.';
          return [{ fieldTree: field, kind: 'server', message }];
        }
      });
    } finally {
      this.saving.set(false);
    }
  }

  private async syncSpecializations(): Promise<void> {
    const next = new Set(this.selectedSpecializations().map((item) => item.id));
    const previous = new Set(this.initialSpecializationIds);

    const toAssign = [...next].filter((id) => !previous.has(id));
    const toUnassign = [...previous].filter((id) => !next.has(id));

    for (const id of toAssign) {
      await this.specializationsService.assign(id, this.userId);
    }
    for (const id of toUnassign) {
      await this.specializationsService.unassign(id, this.userId);
    }

    this.initialSpecializationIds = [...next];
  }
}
