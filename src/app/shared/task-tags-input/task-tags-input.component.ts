import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { HlmIconImports } from 'spartan/icon';

@Component({
  selector: 'app-task-tags-input',
  imports: [NgIcon, ...HlmIconImports],
  providers: [provideIcons({ lucideX })],
  template: `
    <div
      class="border-input bg-background focus-within:border-ring focus-within:ring-ring/50 flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm shadow-xs transition-[color,box-shadow] focus-within:ring-3"
      [class.max-w-md]="!fullWidth()"
      [class.opacity-60]="disabled()"
      (click)="focusInput()"
    >
      @for (tag of tags(); track tag) {
        <span
          class="border-border bg-muted/50 text-foreground inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
        >
          <span class="truncate">{{ tag }}</span>
          <button
            type="button"
            class="text-muted-foreground hover:text-foreground shrink-0 rounded-sm"
            [disabled]="disabled()"
            [attr.aria-label]="'Remove ' + tag"
            (click)="$event.stopPropagation(); removeTag(tag)"
          >
            <ng-icon hlm name="lucideX" size="sm" />
          </button>
        </span>
      }

      <input
        #draftInput
        type="text"
        class="placeholder:text-muted-foreground min-w-24 flex-1 border-0 bg-transparent p-0 text-sm outline-none disabled:cursor-not-allowed"
        [attr.maxlength]="maxItemLength()"
        [placeholder]="tags().length === 0 ? placeholder() : ''"
        [disabled]="disabled()"
        [value]="draft()"
        (input)="onDraftInput($event)"
        (keydown)="onDraftKeydown($event)"
        (blur)="commitDraft()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class TaskTagsInputComponent {
  readonly tags = input<string[]>([]);
  readonly disabled = input(false);
  readonly placeholder = input('Add tags…');
  readonly fullWidth = input(false);
  readonly maxItems = input(20);
  readonly maxItemLength = input(40);
  readonly tagsChange = output<string[]>();

  readonly draft = signal('');
  private readonly draftInput = viewChild<ElementRef<HTMLInputElement>>('draftInput');

  focusInput(): void {
    if (this.disabled()) {
      return;
    }
    this.draftInput()?.nativeElement.focus();
  }

  onDraftInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  onDraftKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.commitDraft();
      return;
    }

    if (event.key === 'Backspace' && this.draft().length === 0 && this.tags().length > 0) {
      event.preventDefault();
      this.removeTag(this.tags()[this.tags().length - 1]!);
    }
  }

  commitDraft(): void {
    const next = this.draft().trim().replace(/,$/, '').trim();
    if (!next || this.disabled()) {
      this.draft.set('');
      return;
    }

    const current = this.tags();
    if (current.some((tag) => tag.toLowerCase() === next.toLowerCase())) {
      this.draft.set('');
      return;
    }

    if (next.length > this.maxItemLength() || current.length >= this.maxItems()) {
      this.draft.set('');
      return;
    }

    this.draft.set('');
    this.tagsChange.emit([...current, next]);
  }

  removeTag(tag: string): void {
    if (this.disabled()) {
      return;
    }
    this.tagsChange.emit(this.tags().filter((item) => item !== tag));
  }
}
