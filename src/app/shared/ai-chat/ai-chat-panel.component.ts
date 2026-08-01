import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideArrowUp,
  lucideCheck,
  lucideEraser,
  lucideHistory,
  lucidePencil,
  lucidePlus,
  lucideSparkles,
  lucideTrash2,
  lucideX,
} from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import { AiChatService } from '../../services/ai-chat/ai-chat.service';
import { ConfirmAlertDialogComponent } from '../confirm-alert-dialog/confirm-alert-dialog.component';

@Component({
  selector: 'app-ai-chat-panel',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    NgIcon,
    ConfirmAlertDialogComponent,
    ...HlmButtonImports,
    ...HlmIconImports,
  ],
  providers: [
    provideIcons({
      lucideSparkles,
      lucideX,
      lucideArrowUp,
      lucideEraser,
      lucideHistory,
      lucidePlus,
      lucideArrowLeft,
      lucidePencil,
      lucideTrash2,
      lucideCheck,
    }),
  ],
  templateUrl: './ai-chat-panel.component.html',
  styleUrl: './ai-chat-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiChatPanelComponent {
  readonly chat = inject(AiChatService);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  readonly draft = signal('');
  readonly editingId = signal<string | null>(null);
  readonly editTitle = signal('');

  readonly deleteDialogState = signal<'open' | 'closed'>('closed');
  readonly pendingDeleteId = signal<string | null>(null);
  readonly pendingDeleteTitle = signal('');
  private deleteTargetId: string | null = null;

  constructor() {
    afterNextRender(() => this.scrollToBottom());
    effect(() => {
      this.chat.messages();
      this.chat.sending();
      this.chat.historyOpen();
      this.scrollToBottom();
    });
    effect(() => {
      if (!this.chat.historyOpen()) {
        this.cancelEdit();
      }
    });
    effect(() => {
      if (this.editingId() && this.titleInput()) {
        queueMicrotask(() => this.titleInput()?.nativeElement.focus());
      }
    });
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    const text = this.draft().trim();
    if (!text) {
      return;
    }
    this.draft.set('');
    void this.chat.send(text);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSubmit();
    }
  }

  usePrompt(prompt: string): void {
    this.draft.set(prompt);
  }

  startEdit(threadId: string, title: string): void {
    this.editingId.set(threadId);
    this.editTitle.set(title);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editTitle.set('');
  }

  saveTitle(threadId: string, event?: Event): void {
    event?.preventDefault();
    void this.chat.renameThread(threadId, this.editTitle()).then(() => this.cancelEdit());
  }

  requestDelete(threadId: string, title: string): void {
    this.deleteTargetId = threadId;
    this.pendingDeleteId.set(threadId);
    this.pendingDeleteTitle.set(title.trim() || 'Untitled chat');
    this.deleteDialogState.set('open');
  }

  performDelete(): void {
    const threadId = this.deleteTargetId ?? this.pendingDeleteId();
    this.deleteTargetId = null;
    this.pendingDeleteId.set(null);
    this.pendingDeleteTitle.set('');
    if (!threadId) {
      return;
    }
    if (this.editingId() === threadId) {
      this.cancelEdit();
    }
    void this.chat.deleteThread(threadId);
  }

  private scrollToBottom(): void {
    queueMicrotask(() => {
      const el = this.scroller()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }
}
