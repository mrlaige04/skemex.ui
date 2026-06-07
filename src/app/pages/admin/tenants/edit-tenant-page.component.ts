import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { email, FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBuilding2, lucideMail } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmLabelImports } from 'spartan/label';
import { problemDetailMessage } from '../../../http/problem-details';
import { adminAbsolutePath } from '../../../routing/app-paths';
import { SaTenantsService } from '../../../services/admin/sa-tenants.service';

@Component({
  selector: 'app-edit-tenant-page',
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
  providers: [provideIcons({ lucideArrowLeft, lucideBuilding2, lucideMail })],
  templateUrl: './edit-tenant-page.component.html',
  styleUrl: './edit-tenant-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditTenantPageComponent implements OnInit {
  private readonly tenantsService = inject(SaTenantsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly tenantsListLink = adminAbsolutePath('tenants');
  readonly pageTitle = signal('Edit tenant');

  private readonly tenantId = this.route.snapshot.paramMap.get('tenantId') ?? '';

  readonly model = signal({
    name: '',
    email: '',
  });

  readonly tenantForm = form(this.model, (f) => {
    required(f.name);
    maxLength(f.name, 256);
    required(f.email);
    email(f.email);
    maxLength(f.email, 256);
  });

  ngOnInit(): void {
    if (!this.tenantId) {
      this.loadError.set('Tenant id is missing.');
      this.loading.set(false);
      return;
    }

    void this.loadTenant();
  }

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.commit();
  }

  private async loadTenant(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const tenant = await this.tenantsService.get(this.tenantId);
      this.pageTitle.set(tenant.name);
      this.model.set({
        name: tenant.name,
        email: tenant.email,
      });
    } catch (err) {
      this.loadError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.loading.set(false);
    }
  }

  private async commit(): Promise<void> {
    if (this.saving() || !this.tenantId) {
      return;
    }

    this.saving.set(true);
    try {
      await submit(this.tenantForm, async (field) => {
        try {
          const m = field().value();
          await this.tenantsService.update(this.tenantId, {
            name: m.name.trim(),
            email: m.email.trim(),
          });
          await this.router.navigate(this.tenantsListLink);
          return;
        } catch (err) {
          const message =
            err instanceof HttpErrorResponse ? problemDetailMessage(err) : 'Could not update tenant.';
          return [{ fieldTree: field, kind: 'server', message }];
        }
      });
    } finally {
      this.saving.set(false);
    }
  }
}
