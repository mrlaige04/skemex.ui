import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { email, FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideLoaderCircle,
  lucideMail,
  lucideUser,
  lucideUserPlus,
} from '@ng-icons/lucide';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmLabelImports } from 'spartan/label';
import { HlmSelectImports } from 'spartan/select';
import { problemDetailMessage } from '../../../http/problem-details';
import type { LookupUserByEmailResponse, TenantRoleDto } from '../../../models/users/users.models';
import { UsersService } from '../../../services/users/users.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

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
    provideIcons({
      lucideArrowLeft,
      lucideMail,
      lucideUser,
      lucideUserPlus,
      lucideLoaderCircle,
    }),
  ],
  templateUrl: './create-user-page.component.html',
  styleUrl: './create-user-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateUserPageComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly emailLookup$ = new Subject<string>();
  private lookupGeneration = 0;

  readonly saving = signal(false);
  readonly roles = signal<TenantRoleDto[]>([]);
  readonly usersListLink = signal<string[]>([]);
  readonly emailChecking = signal(false);
  readonly emailLookup = signal<LookupUserByEmailResponse | null>(null);

  readonly isInviteMode = computed(() => {
    const lookup = this.emailLookup();
    return lookup?.exists === true && lookup.alreadyInWorkspace !== true;
  });

  readonly alreadyInWorkspace = computed(() => this.emailLookup()?.alreadyInWorkspace === true);

  readonly existingUserName = computed(() => {
    const lookup = this.emailLookup();
    if (!lookup?.exists) {
      return '';
    }
    return `${lookup.firstName ?? ''} ${lookup.lastName ?? ''}`.trim();
  });

  readonly canSubmit = computed(
    () => !this.saving() && !this.emailChecking() && !this.alreadyInWorkspace(),
  );

  readonly model = signal({
    email: '',
    firstName: '',
    lastName: '',
    roleName: 'User',
  });

  readonly userForm = form(this.model, (f) => {
    required(f.email);
    email(f.email);
    maxLength(f.email, 256);
    maxLength(f.firstName, 128);
    maxLength(f.lastName, 128);
    required(f.roleName);
  });

  constructor() {
    effect(() => {
      const emailValue = this.model().email.trim();

      if (!emailValue || !isValidEmail(emailValue)) {
        this.resetEmailLookup();
        return;
      }

      this.emailLookup$.next(emailValue);
    });
  }

  ngOnInit(): void {
    const tenantId = this.route.parent?.snapshot.paramMap.get('tenantId');
    this.usersListLink.set(tenantId ? ['/tenant', tenantId, 'users'] : ['/tenant', 'select']);
    void this.loadRoles();

    this.emailLookup$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((emailValue) => {
        void this.lookupEmail(emailValue);
      });
  }

  onRoleChange(value: string | null): void {
    this.model.update((m) => ({ ...m, roleName: value ?? 'User' }));
  }

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.commit();
  }

  inviteExistingUser(event: Event): void {
    event.preventDefault();
    void this.commit();
  }

  private resetEmailLookup(): void {
    this.lookupGeneration += 1;
    this.emailChecking.set(false);
    this.emailLookup.set(null);
  }

  private async lookupEmail(emailValue: string): Promise<void> {
    const generation = ++this.lookupGeneration;
    this.emailChecking.set(true);
    this.emailLookup.set(null);

    try {
      const result = await this.usersService.lookupByEmail(emailValue);
      if (generation !== this.lookupGeneration || this.model().email.trim() !== emailValue) {
        return;
      }
      this.emailLookup.set(result);
    } catch {
      if (generation !== this.lookupGeneration || this.model().email.trim() !== emailValue) {
        return;
      }
      this.emailLookup.set(null);
    } finally {
      if (generation === this.lookupGeneration) {
        this.emailChecking.set(false);
      }
    }
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
    if (!this.canSubmit()) {
      return;
    }

    this.saving.set(true);
    try {
      await submit(this.userForm, async (field) => {
        try {
          const m = field().value();
          const lookup = this.emailLookup();
          const inviteMode = lookup?.exists === true && !lookup.alreadyInWorkspace;

          if (!inviteMode) {
            if (!m.firstName.trim()) {
              return [{ fieldTree: field.firstName, kind: 'required', message: 'First name is required.' }];
            }
            if (!m.lastName.trim()) {
              return [{ fieldTree: field.lastName, kind: 'required', message: 'Last name is required.' }];
            }
          }

          await this.usersService.create({
            email: m.email.trim(),
            firstName: inviteMode
              ? (lookup?.firstName?.trim() ?? m.firstName.trim())
              : m.firstName.trim(),
            lastName: inviteMode
              ? (lookup?.lastName?.trim() ?? m.lastName.trim())
              : m.lastName.trim(),
            roleName: m.roleName,
          });
          await this.router.navigate(this.usersListLink());
          return;
        } catch (err) {
          const message =
            err instanceof HttpErrorResponse ? problemDetailMessage(err) : 'Could not send invitation.';
          return [{ fieldTree: field, kind: 'server', message }];
        }
      });
    } finally {
      this.saving.set(false);
    }
  }
}
