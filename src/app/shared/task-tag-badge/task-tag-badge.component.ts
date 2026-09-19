import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { HlmIconImports } from 'spartan/icon';

@Component({
  selector: 'app-task-tag-badge',
  imports: [NgIcon, ...HlmIconImports],
  providers: [provideIcons({ lucideX })],
  template: `
    <span
      class="border-border bg-muted/40 text-foreground inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
    >
      <span class="truncate">{{ label() }}</span>
      @if (removable()) {
        <button
          type="button"
          class="text-muted-foreground hover:text-foreground shrink-0 rounded-sm p-0.5"
          [disabled]="disabled()"
          [attr.aria-label]="'Remove tag ' + label()"
          (click)="$event.stopPropagation(); remove.emit()"
        >
          <ng-icon hlm name="lucideX" size="sm" />
        </button>
      }
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskTagBadgeComponent {
  readonly label = input.required<string>();
  readonly removable = input(false);
  readonly disabled = input(false);
  readonly remove = output<void>();
}
