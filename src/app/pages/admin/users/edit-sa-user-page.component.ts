import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { email, FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideMail, lucideUser } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmLabelImports } from 'spartan/label';
import { problemDetailMessage } from '../../../http/problem-details';
import { adminAbsolutePath } from '../../../routing/app-paths';
import { SaUsersService } from '../../../services/admin/sa-users.service';

@Component({
  selector: 'app-edit-sa-user-page',
  imports: [
    RouterLink,
    FormField,
    NgIcon,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideMail, lucideUser })],
  templateUrl: './edit-sa-user-page.component.html',
  styleUrl: './edit-sa-user-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditSaUserPageComponent implements OnInit {
  private readonly usersService = inject(SaUsersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly usersListLink = adminAbsolutePath('users');
  readonly pageTitle = signal('Edit user');
  readonly workspaceCount = signal(0);

  private readonly userId = this.route.snapshot.paramMap.get('userId') ?? '';

  readonly model = signal({
    email: '',
    firstName: '',
    lastName: '',
  });

  readonly userForm = form(this.model, (f) => {
    required(f.email);
    email(f.email);
    maxLength(f.email, 256);
    required(f.firstName);
    maxLength(f.firstName, 128);
    required(f.lastName);
    maxLength(f.lastName, 128);
  });

  ngOnInit(): void {
    if (!this.userId) {
      this.loadError.set('User id is missing.');
      this.loading.set(false);
      return;
    }

    void this.loadUser();
  }

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.commit();
  }

  private async loadUser(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const user = await this.usersService.get(this.userId);
      this.pageTitle.set(`${user.firstName} ${user.lastName}`.trim() || user.email);
      this.workspaceCount.set(user.workspaceCount);
      this.model.set({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (err) {
      this.loadError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.loading.set(false);
    }
  }

  private async commit(): Promise<void> {
    if (this.saving() || !this.userId) {
      return;
    }

    this.saving.set(true);
    try {
      await submit(this.userForm, async (field) => {
        try {
          const m = field().value();
          await this.usersService.update(this.userId, {
            email: m.email.trim(),
            firstName: m.firstName.trim(),
            lastName: m.lastName.trim(),
          });
          await this.router.navigate(this.usersListLink);
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
