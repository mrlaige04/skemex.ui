import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ProjectTaskType = 'Feature' | 'Task' | 'Bug';

const TYPE_LABELS: Record<string, string> = {
  Feature: 'Feature',
  Task: 'Task',
  Bug: 'Bug',
};

@Component({
  selector: 'app-task-type-badge',
  template: `
    <span
      class="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
      [class]="toneClass()"
    >
      {{ label() }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskTypeBadgeComponent {
  readonly type = input<string | null | undefined>('Task');

  readonly normalized = computed(() => {
    const raw = this.type()?.trim() ?? 'Task';
    const key = raw.toLowerCase();
    if (key === 'feature' || key === 'story') {
      return 'Feature';
    }
    if (key === 'bug') {
      return 'Bug';
    }
    return 'Task';
  });

  readonly label = computed(() => TYPE_LABELS[this.normalized()] ?? 'Task');

  readonly toneClass = computed(() => {
    switch (this.normalized()) {
      case 'Feature':
        return 'border-sky-500/35 bg-sky-500/10 text-sky-800 dark:text-sky-200';
      case 'Bug':
        return 'border-rose-500/35 bg-rose-500/10 text-rose-800 dark:text-rose-200';
      default:
        return 'border-border bg-muted/50 text-muted-foreground';
    }
  });
}
