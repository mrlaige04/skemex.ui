import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  injectFlexRenderContext,
  type CellContext,
} from '@tanstack/angular-table';
import type { ProjectTaskDto, ProjectTaskUserDto } from '../../models/projects/projects.models';

@Component({
  selector: 'app-issues-person-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (person(); as user) {
      <div class="flex min-w-0 items-center gap-2">
        <div
          class="border-border bg-muted/40 text-muted-foreground relative size-6 shrink-0 overflow-hidden rounded-md border text-[10px] font-semibold"
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
        <span class="text-muted-foreground truncate text-sm">{{ displayName() }}</span>
      </div>
    } @else {
      <span class="text-muted-foreground text-sm">Unassigned</span>
    }
  `,
})
export class IssuesPersonCellComponent {
  private readonly ctx = injectFlexRenderContext<CellContext<ProjectTaskDto, unknown>>();
  readonly avatarFailed = signal(false);

  readonly person = computed((): ProjectTaskUserDto | null => {
    const row = this.ctx.row.original;
    return this.ctx.column.id === 'reporter' ? row.reporter : (row.assignee ?? null);
  });

  readonly avatarUrl = computed(() => this.person()?.avatarUrl?.trim() || null);

  readonly displayName = computed(() => {
    const user = this.person();
    if (!user) {
      return 'Unassigned';
    }
    const full = `${user.firstName} ${user.lastName}`.trim();
    return full || user.email || '—';
  });

  readonly initials = computed(() => {
    const user = this.person();
    if (!user) {
      return '?';
    }
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
