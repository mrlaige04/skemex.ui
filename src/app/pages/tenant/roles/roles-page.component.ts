import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideKeyRound, lucidePencil, lucidePlus, lucideTrash2 } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { problemDetailMessage } from '../../../http/problem-details';
import { PERMISSIONS } from '../../../models/auth/permissions';
import type { RoleDetailDto } from '../../../models/roles/roles.models';
import { APP_PATHS } from '../../../routing/app-paths';
import { AuthService } from '../../../services/auth/auth.service';
import { RolesService } from '../../../services/roles/roles.service';
import { ConfirmAlertDialogComponent } from '../../../shared/confirm-alert-dialog/confirm-alert-dialog.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-roles-page',
  imports: [
    RouterLink,
    NgIcon,
    ConfirmAlertDialogComponent,
    HasPermissionDirective,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
  ],
  providers: [provideIcons({ lucidePlus, lucidePencil, lucideTrash2, lucideKeyRound })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './roles-page.component.html',
})
export class RolesPageComponent implements OnInit {
  private readonly rolesService = inject(RolesService);
  readonly auth = inject(AuthService);
  readonly permissions = PERMISSIONS;

  /** When true, omit page-level title (used inside Settings). */
  readonly embedded = input(false);

  readonly loading = signal(true);
  readonly listError = signal<string | null>(null);
  readonly roles = signal<RoleDetailDto[]>([]);
  readonly rolesNewLink = APP_PATHS.rolesNew;
  readonly confirmDialogState = signal<'open' | 'closed'>('closed');
  readonly pendingDelete = signal<RoleDetailDto | null>(null);
  readonly deleting = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  roleEditLink(id: string): string {
    return APP_PATHS.roleEdit(id);
  }

  askDelete(role: RoleDetailDto): void {
    this.pendingDelete.set(role);
    this.confirmDialogState.set('open');
  }

  async confirmDelete(): Promise<void> {
    const role = this.pendingDelete();
    if (!role) {
      return;
    }
    this.deleting.set(true);
    this.listError.set(null);
    try {
      await this.rolesService.delete(role.id);
      this.roles.update((list) => list.filter((r) => r.id !== role.id));
      this.confirmDialogState.set('closed');
      this.pendingDelete.set(null);
    } catch (err) {
      this.listError.set(
        err instanceof HttpErrorResponse
          ? problemDetailMessage(err) ?? 'Failed to delete role.'
          : 'Failed to delete role.',
      );
    } finally {
      this.deleting.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.listError.set(null);
    try {
      this.roles.set(await this.rolesService.list());
    } catch (err) {
      this.listError.set(
        err instanceof HttpErrorResponse
          ? problemDetailMessage(err) ?? 'Failed to load roles.'
          : 'Failed to load roles.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
