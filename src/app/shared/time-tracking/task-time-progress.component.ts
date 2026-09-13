import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatDurationMinutes, isOverEstimate } from './time-format.util';

@Component({
  selector: 'app-task-time-progress',
  template: `
    @if (hasTimeData()) {
      <div class="space-y-2" [attr.title]="summaryTitle()">
        <div class="space-y-1.5">
          <div class="flex items-center gap-2">
            <span
              class="text-muted-foreground w-16 shrink-0"
              [class]="compact() ? 'text-[10px]' : 'text-xs'"
              >Remaining</span
            >
            <div class="bg-muted h-2 min-w-0 flex-1 overflow-hidden rounded-sm">
              <div
                class="bg-amber-500/85 h-full rounded-sm"
                [style.width.%]="remainingBarWidth()"
              ></div>
            </div>
            <span
              class="w-14 shrink-0 text-right tabular-nums"
              [class]="compact() ? 'text-[10px]' : 'text-xs'"
              >{{ remainingLabel() }}</span
            >
          </div>

          <div class="flex items-center gap-2">
            <span
              class="text-muted-foreground w-16 shrink-0"
              [class]="compact() ? 'text-[10px]' : 'text-xs'"
              >Logged</span
            >
            <div class="bg-muted h-2 min-w-0 flex-1 overflow-hidden rounded-sm">
              <div
                class="h-full rounded-sm"
                [class]="over() ? 'bg-red-500/85' : 'bg-emerald-600/80'"
                [style.width.%]="loggedBarWidth()"
              ></div>
            </div>
            <span
              class="w-14 shrink-0 text-right tabular-nums"
              [class]="compact() ? 'text-[10px]' : 'text-xs'"
              >{{ spentLabel() }}</span
            >
          </div>
        </div>

        @if (!compact() && storyPoints() != null) {
          <p class="text-muted-foreground text-xs">Story points: {{ storyPoints() }}</p>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class TaskTimeProgressComponent {
  readonly spentMinutes = input(0);
  readonly originalEstimateMinutes = input<number | null | undefined>(null);
  readonly remainingEstimateMinutes = input<number | null | undefined>(null);
  readonly storyPoints = input<number | null | undefined>(null);
  readonly compact = input(false);

  readonly hasTimeData = computed(
    () =>
      this.spentMinutes() > 0
      || this.originalEstimateMinutes() != null
      || this.remainingEstimateMinutes() != null
      || this.storyPoints() != null,
  );

  readonly remainingMinutes = computed(() => {
    if (this.remainingEstimateMinutes() != null) {
      return this.remainingEstimateMinutes()!;
    }
    if (this.originalEstimateMinutes() != null) {
      return Math.max(0, this.originalEstimateMinutes()! - this.spentMinutes());
    }
    return null;
  });

  readonly scale = computed(() =>
    Math.max(
      this.originalEstimateMinutes() ?? 0,
      this.spentMinutes(),
      this.remainingMinutes() ?? 0,
      1,
    ),
  );

  readonly loggedBarWidth = computed(() =>
    Math.min(100, Math.round((this.spentMinutes() / this.scale()) * 100)),
  );

  readonly remainingBarWidth = computed(() => {
    if (this.remainingMinutes() == null) {
      return 0;
    }
    return Math.min(100, Math.round((this.remainingMinutes()! / this.scale()) * 100));
  });

  readonly over = computed(() =>
    isOverEstimate(this.spentMinutes(), this.originalEstimateMinutes()),
  );

  readonly spentLabel = computed(() => formatDurationMinutes(this.spentMinutes()));
  readonly remainingLabel = computed(() =>
    this.remainingMinutes() == null ? '—' : formatDurationMinutes(this.remainingMinutes()),
  );

  readonly summaryTitle = computed(() => {
    const parts = [`Logged ${this.spentLabel()}`];
    if (this.remainingMinutes() != null) {
      parts.unshift(`Remaining ${this.remainingLabel()}`);
    }
    if (this.originalEstimateMinutes() != null) {
      parts.push(`Estimate ${formatDurationMinutes(this.originalEstimateMinutes())}`);
    }
    return parts.join(' · ');
  });
}
