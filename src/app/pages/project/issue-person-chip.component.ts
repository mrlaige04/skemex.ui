import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { ProjectTaskUserDto } from '../../models/projects/projects.models';

@Component({
  selector: 'app-issue-person-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (user(); as person) {
      <div class="flex min-w-0 items-center gap-2.5">
        <div
          class="border-border bg-muted/50 text-muted-foreground relative size-8 shrink-0 overflow-hidden rounded-md border text-xs font-semibold"
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
        <div class="min-w-0">
          <p class="truncate text-sm font-medium leading-tight">{{ displayName() }}</p>
          @if (showEmail() && person.email) {
            <p class="text-muted-foreground truncate text-xs">{{ person.email }}</p>
          }
        </div>
      </div>
    } @else {
      <div class="flex min-w-0 items-center gap-2.5">
        <div
          class="border-border text-muted-foreground/50 flex size-8 shrink-0 items-center justify-center rounded-md border border-dashed text-xs"
          aria-hidden="true"
        >
          —
        </div>
        <p class="text-muted-foreground text-sm">{{ emptyLabel() }}</p>
      </div>
    }
  `,
})
export class IssuePersonChipComponent {
  readonly user = input<ProjectTaskUserDto | null | undefined>(null);
  readonly emptyLabel = input('Unassigned');
  readonly showEmail = input(false);

  readonly avatarFailed = signal(false);

  readonly avatarUrl = computed(() => this.user()?.avatarUrl?.trim() || null);

  readonly displayName = computed(() => {
    const person = this.user();
    if (!person) {
      return this.emptyLabel();
    }
    const full = `${person.firstName} ${person.lastName}`.trim();
    return full || person.email || '—';
  });

  readonly initials = computed(() => {
    const person = this.user();
    if (!person) {
      return '?';
    }
    const fromName = `${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`.trim();
    if (fromName) {
      return fromName.toUpperCase();
    }
    return (person.email[0] ?? '?').toUpperCase();
  });

  onAvatarError(): void {
    this.avatarFailed.set(true);
  }
}
