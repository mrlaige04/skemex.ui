import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideLoaderCircle, lucideSave } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmCheckboxImports } from 'spartan/checkbox';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputImports } from 'spartan/input';
import { HlmLabelImports } from 'spartan/label';
import { problemDetailMessage } from '../../../http/problem-details';
import type { PermissionGroupDto, RoleDetailDto } from '../../../models/roles/roles.models';
import { APP_PATHS } from '../../../routing/app-paths';
import { RolesService } from '../../../services/roles/roles.service';

@Component({
  selector: 'app-edit-role-page',
  imports: [
    FormsModule,
    RouterLink,
    NgIcon,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmCheckboxImports,
    ...HlmIconImports,
    ...HlmInputImports,
    ...HlmLabelImports,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideSave, lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './edit-role-page.component.html',
})
export class EditRolePageComponent implements OnInit {
  private readonly rolesService = inject(RolesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly rolesListLink = APP_PATHS.settingsRoles;
  readonly isCreate = signal(true);
  readonly roleId = signal<string | null>(null);
  readonly name = signal('');
  readonly groups = signal<PermissionGroupDto[]>([]);
  readonly selectedIds = signal<Set<string>>(new Set());

  readonly title = computed(() => (this.isCreate() ? 'Create role' : 'Edit role'));
  readonly canSave = computed(
    () => !this.saving() && !this.loading() && this.name().trim().length > 0,
  );

  readonly allPermissionIds = computed(() =>
    this.groups().flatMap((g) => g.permissions.map((p) => p.id)),
  );

  readonly allPermissionsSelected = computed(() => {
    const ids = this.allPermissionIds();
    if (ids.length === 0) {
      return false;
    }
    const selected = this.selectedIds();
    return ids.every((id) => selected.has(id));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('roleId');
    this.isCreate.set(!id);
    this.roleId.set(id);
    void this.load(id);
  }

  isSelected(permissionId: string): boolean {
    return this.selectedIds().has(permissionId);
  }

  togglePermission(permissionId: string, checked: boolean): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(permissionId);
      } else {
        next.delete(permissionId);
      }
      return next;
    });
  }

  toggleGroup(group: PermissionGroupDto, checked: boolean): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      for (const permission of group.permissions) {
        if (checked) {
          next.add(permission.id);
        } else {
          next.delete(permission.id);
        }
      }
      return next;
    });
  }

  groupFullySelected(group: PermissionGroupDto): boolean {
    const selected = this.selectedIds();
    return group.permissions.length > 0 && group.permissions.every((p) => selected.has(p.id));
  }

  toggleAllPermissions(): void {
    if (this.allPermissionsSelected()) {
      this.selectedIds.set(new Set());
      return;
    }
    this.selectedIds.set(new Set(this.allPermissionIds()));
  }

  async save(): Promise<void> {
    if (!this.canSave()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const body = {
      name: this.name().trim(),
      permissionIds: [...this.selectedIds()],
    };

    try {
      if (this.isCreate()) {
        await this.rolesService.create(body);
      } else {
        const id = this.roleId();
        if (!id) {
          return;
        }
        await this.rolesService.update(id, body);
      }
      await this.router.navigateByUrl(APP_PATHS.settingsRoles);
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse
          ? problemDetailMessage(err) ?? 'Failed to save role.'
          : 'Failed to save role.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  private async load(roleId: string | null): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [catalog, roles] = await Promise.all([
        this.rolesService.permissions(),
        roleId ? this.rolesService.list() : Promise.resolve([] as RoleDetailDto[]),
      ]);
      this.groups.set(catalog);

      if (roleId) {
        const role = roles.find((r) => r.id === roleId);
        if (!role) {
          this.error.set('Role was not found.');
          return;
        }
        if (role.isSystem) {
          await this.router.navigateByUrl(APP_PATHS.settingsRoles);
          return;
        }
        this.name.set(role.name);
        this.selectedIds.set(new Set(role.permissionIds));
      }
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse
          ? problemDetailMessage(err) ?? 'Failed to load role editor.'
          : 'Failed to load role editor.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
