import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { email, FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBuilding2, lucideMail, lucideUser } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmLabelImports } from 'spartan/label';
import { problemDetailMessage } from '../../../http/problem-details';
import { adminAbsolutePath } from '../../../routing/app-paths';
import { SaTenantsService } from '../../../services/admin/sa-tenants.service';

@Component({
  selector: 'app-create-tenant-page',
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
  providers: [provideIcons({ lucideArrowLeft, lucideBuilding2, lucideMail, lucideUser })],
  templateUrl: './create-tenant-page.component.html',
  styleUrl: './create-tenant-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTenantPageComponent {
  private readonly tenantsService = inject(SaTenantsService);
  private readonly router = inject(Router);

  readonly saving = signal(false);
  readonly tenantsListLink = adminAbsolutePath('tenants');

  readonly model = signal({
    name: '',
    email: '',
    firstName: '',
    lastName: '',
  });

  readonly tenantForm = form(this.model, (f) => {
    required(f.name);
    maxLength(f.name, 256);
    required(f.email);
    email(f.email);
    maxLength(f.email, 256);
    maxLength(f.firstName, 128);
    maxLength(f.lastName, 128);
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
      await submit(this.tenantForm, async (field) => {
        try {
          const m = field().value();
          await this.tenantsService.create({
            name: m.name.trim(),
            email: m.email.trim(),
            firstName: m.firstName.trim() || undefined,
            lastName: m.lastName.trim() || undefined,
          });
          await this.router.navigate(this.tenantsListLink);
          return;
        } catch (err) {
          const message =
            err instanceof HttpErrorResponse ? problemDetailMessage(err) : 'Could not create tenant.';
          return [{ fieldTree: field, kind: 'server', message }];
        }
      });
    } finally {
      this.saving.set(false);
    }
  }
}
