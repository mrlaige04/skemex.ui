import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { email, FormField, form, maxLength, minLength, required, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideKeyRound,
  lucideMail,
  lucideUser,
} from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmLabelImports } from 'spartan/label';
import { HlmSelectImports } from 'spartan/select';
import { problemDetailMessage } from '../../../http/problem-details';
import type { TenantRoleDto } from '../../../models/users/users.models';
import { UsersService } from '../../../services/users/users.service';

@Component({
  selector: 'app-create-user-page',
  imports: [
    RouterLink,
    FormField,
    NgIcon,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
  ],
  providers: [
    provideIcons({ lucideArrowLeft, lucideMail, lucideUser, lucideKeyRound }),
  ],
  templateUrl: './create-user-page.component.html',
  styleUrl: './create-user-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateUserPageComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly saving = signal(false);
  readonly roles = signal<TenantRoleDto[]>([]);
  readonly usersListLink = signal<string[]>([]);

  readonly model = signal({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    roleName: 'User',
  });

  readonly userForm = form(this.model, (f) => {
    required(f.email);
    email(f.email);
    maxLength(f.email, 256);
    required(f.firstName);
    maxLength(f.firstName, 128);
    required(f.lastName);
    maxLength(f.lastName, 128);
    required(f.password);
    minLength(f.password, 6);
    required(f.roleName);
  });

  ngOnInit(): void {
    const tenantId = this.route.parent?.snapshot.paramMap.get('tenantId');
    this.usersListLink.set(tenantId ? ['/tenant', tenantId, 'users'] : ['/tenant', 'select']);
    void this.loadRoles();
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
      const roles = await this.usersService.roles();
      this.roles.set(roles);
      const first = roles[0]?.name;
      if (first) {
        this.model.update((m) => ({ ...m, roleName: first }));
      }
    } catch {
      this.roles.set([
        { id: '', name: 'User' },
        { id: '', name: 'Admin' },
      ]);
    }
  }

  private async commit(): Promise<void> {
    this.saving.set(true);
    try {
      await submit(this.userForm, async (field) => {
        try {
          const m = field().value();
          await this.usersService.create({
            email: m.email.trim(),
            firstName: m.firstName.trim(),
            lastName: m.lastName.trim(),
            password: m.password,
            roleName: m.roleName,
          });
          await this.router.navigate(this.usersListLink());
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
