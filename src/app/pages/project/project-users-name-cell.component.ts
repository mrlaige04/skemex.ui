import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  injectFlexRenderContext,
  type CellContext,
} from '@tanstack/angular-table';
import type { ProjectUserDto } from '../../models/projects/projects.models';

@Component({
  selector: 'app-project-users-name-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2.5">
      <div
        class="border-border bg-muted/40 text-muted-foreground relative size-8 shrink-0 overflow-hidden rounded-md border text-xs font-semibold"
      >
        @if (avatarUrl(); as src) {
          <img
            [src]="src"
            alt=""
            class="absolute inset-0 size-full object-cover"
            [class.hidden]="avatarFailed()"
            (error)="onAvatarError()"
          />
        }
        <span
          class="flex size-full items-center justify-center"
          [class.hidden]="!!avatarUrl() && !avatarFailed()"
          aria-hidden="true"
        >
          {{ initials() }}
        </span>
      </div>
      <span class="font-medium">{{ displayName() }}</span>
    </div>
  `,
})
export class ProjectUsersNameCellComponent {
  private readonly ctx = injectFlexRenderContext<CellContext<ProjectUserDto, unknown>>();
  readonly avatarFailed = signal(false);

  readonly user = computed(() => this.ctx.row.original);

  readonly displayName = computed(() => {
    const user = this.user();
    const full = `${user.firstName} ${user.lastName}`.trim();
    return full || user.email;
  });

  readonly avatarUrl = computed(() => this.user().avatarUrl?.trim() || null);

  readonly initials = computed(() => {
    const user = this.user();
    const fromName = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.trim();
    if (fromName) {
      return fromName.toUpperCase();
    }
    return (user.email[0] ?? '?').toUpperCase();
  });

  onAvatarError(): void {
    this.avatarFailed.set(true);
  }
}
