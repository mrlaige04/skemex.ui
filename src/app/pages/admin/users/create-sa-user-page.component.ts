import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
  selector: 'app-create-sa-user-page',
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
  templateUrl: './create-sa-user-page.component.html',
  styleUrl: './create-sa-user-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateSaUserPageComponent {
  private readonly usersService = inject(SaUsersService);
  private readonly router = inject(Router);

  readonly saving = signal(false);
  readonly usersListLink = adminAbsolutePath('users');

  readonly model = signal({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
  });

  readonly userForm = form(this.model, (f) => {
    required(f.email);
    email(f.email);
    maxLength(f.email, 256);
    required(f.firstName);
    maxLength(f.firstName, 128);
    required(f.lastName);
    maxLength(f.lastName, 128);
    maxLength(f.password, 128);
  });

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.commit();
  }

  private async commit(): Promise<void> {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    try {
      await submit(this.userForm, async (field) => {
        try {
          const m = field().value();
          await this.usersService.create({
            email: m.email.trim(),
            firstName: m.firstName.trim(),
            lastName: m.lastName.trim(),
            password: m.password.trim() || undefined,
          });
          await this.router.navigate(this.usersListLink);
          return;
        } catch (err) {
          const message =
            err instanceof HttpErrorResponse ? problemDetailMessage(err) : 'Could not create user.';
          return [{ fieldTree: field, kind: 'server', message }];
        }
      });
    } finally {
      this.saving.set(false);
    }
  }
}
