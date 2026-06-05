import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { form, required, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideFolderKanban, lucideMail, lucideUser } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmItemImports } from 'spartan/item';
import { HlmLabelImports } from 'spartan/label';
import { HlmSelectImports } from 'spartan/select';
import { problemDetailMessage } from '../../../http/problem-details';
import type { TenantRoleDto } from '../../../models/users/users.models';
import { APP_PATHS } from '../../../routing/app-paths';
import { UsersService } from '../../../services/users/users.service';

@Component({
  selector: 'app-edit-user-page',
  imports: [
    RouterLink,
    NgIcon,
    ...HlmButtonImports,
    ...HlmCardImports,
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly roles = signal<TenantRoleDto[]>([]);
  readonly usersListLink = signal<string[]>([]);
  readonly pageTitle = signal('Edit user');
  readonly userEmail = signal('');
  readonly firstName = signal('');
  readonly lastName = signal('');

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

  ngOnInit(): void {
    this.usersListLink.set([APP_PATHS.users]);

    if (!this.userId) {
      this.loadError.set('User id is missing.');
      this.loading.set(false);
      return;
    }

    void this.loadRoles();
    void this.loadUser();
  }

  onRoleChange(value: string | null): void {
    this.model.update((m) => ({ ...m, roleName: value ?? 'User' }));
  }

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.commit();
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

  private async loadUser(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const user = await this.usersService.get(this.userId);
      const name = `${user.firstName} ${user.lastName}`.trim();
      this.pageTitle.set(name ? `Edit ${name}` : 'Edit user');
      this.userEmail.set(user.email);
      this.firstName.set(user.firstName);
      this.lastName.set(user.lastName);
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
          await this.usersService.update(this.userId, {
            roleName: m.roleName,
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
}
