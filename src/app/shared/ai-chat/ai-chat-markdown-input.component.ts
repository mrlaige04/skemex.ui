import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { Editor, markInputRule, markPasteRule } from '@tiptap/core';
import Bold, {
  starInputRegex as boldStarInputRegex,
  starPasteRegex as boldStarPasteRegex,
} from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import {
  AiChatArtefactChip,
  type AiChatArtefactChipAttrs,
} from './ai-chat-artefact-chip.extension';
import { serializeAiChatDoc } from './ai-chat-markdown-serialize.util';

/** `__italic__` only (no single `_` / `*`). */
const italicDoubleUnderscoreInputRegex =
  /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/;
const italicDoubleUnderscorePasteRegex =
  /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))/g;

/** Bold only via `**…**` (no `__`). */
const ChatBold = Bold.extend({
  addInputRules() {
    return [
      markInputRule({
        find: boldStarInputRegex,
        type: this.type,
      }),
    ];
  },
  addPasteRules() {
    return [
      markPasteRule({
        find: boldStarPasteRegex,
        type: this.type,
      }),
    ];
  },
});

/** Italic only via `__…__`. */
const ChatItalic = Italic.extend({
  addInputRules() {
    return [
      markInputRule({
        find: italicDoubleUnderscoreInputRegex,
        type: this.type,
      }),
    ];
  },
  addPasteRules() {
    return [
      markPasteRule({
        find: italicDoubleUnderscorePasteRegex,
        type: this.type,
      }),
    ];
  },
  renderMarkdown(node, helpers) {
    return `__${helpers.renderChildren(node)}__`;
  },
});

/**
 * Markdown-shortcut composer (Tiptap + tiptap-markdown).
 * **bold**, __italic__, ~~strike~~, `code`, inline artefact chips.
 */
@Component({
  selector: 'app-ai-chat-markdown-input',
  template: `<div #host class="ai-md-input" [class.ai-md-input--disabled]="disabled()"></div>`,
  styleUrl: './ai-chat-markdown-input.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ai-md-input-host' },
})
export class AiChatMarkdownInputComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  readonly placeholder = input('Describe a goal to decompose…');
  readonly disabled = input(false);

  readonly markdownChange = output<string>();
  readonly submit = output<void>();
  /** Fired when user types `@` at a mention-like boundary (start / after whitespace). */
  readonly mentionShortcut = output<void>();
  /** Fired when the open `@` mention should dismiss without replacing `@` (e.g. Space). */
  readonly mentionDismiss = output<void>();

  private editor: Editor | null = null;
  private syncingFromParent = false;
  /** Doc position of the live `@` trigger while the artefact menu is open. */
  private mentionAt: number | null = null;
  /** Set on `@` keydown; consumed in onUpdate after the character is inserted. */
  private pendingMentionOpen = false;

  constructor() {
    afterNextRender(() => this.createEditor());

    effect(() => {
      const disabled = this.disabled();
      this.editor?.setEditable(!disabled);
    });

    this.destroyRef.onDestroy(() => {
      this.editor?.destroy();
      this.editor = null;
    });
  }

  /** Reset / seed content (after send or prompt chips). */
  setMarkdown(value: string): void {
    if (!this.editor) {
      return;
    }
    this.syncingFromParent = true;
    this.editor.commands.setContent(value || '', { emitUpdate: false });
    this.syncingFromParent = false;
    this.markdownChange.emit(this.readMarkdown());
  }

  focus(position: 'end' | 'keep' = 'end'): void {
    if (position === 'keep') {
      this.editor?.commands.focus();
      return;
    }
    this.editor?.commands.focus('end');
  }

  /** Current composer markdown with artefact chips serialized as tokens. */
  getMarkdown(): string {
    return this.readMarkdown();
  }

  /** Drop the live `@` trigger marker without changing editor content. */
  clearMentionTrigger(): void {
    this.mentionAt = null;
    this.pendingMentionOpen = false;
  }

  insertArtefactChip(attrs: AiChatArtefactChipAttrs): void {
    if (!this.editor || this.disabled()) {
      return;
    }

    const at = this.resolveMentionAt();
    this.mentionAt = null;

    const chain = this.editor.chain().focus();
    if (at != null) {
      chain.deleteRange({ from: at, to: at + 1 });
    }
    chain.insertArtefactChip(attrs).insertContent(' ').run();
    this.markdownChange.emit(this.readMarkdown());
  }

  /** Artefact chips currently in the editor (source of truth for execute payload). */
  listArtefacts(): AiChatArtefactChipAttrs[] {
    return this.listArtefactsInDocumentOrder()
      .filter((chip) => chip.number > 0 && chip.id.length > 0)
      .sort((a, b) => a.number - b.number);
  }

  /** Chips in document order (matches TipTap `[artefactChip]` stub order). */
  private listArtefactsInDocumentOrder(): AiChatArtefactChipAttrs[] {
    const editor = this.editor;
    if (!editor) {
      return [];
    }

    const chips: AiChatArtefactChipAttrs[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name !== 'artefactChip') {
        return true;
      }
      chips.push({
        kind: (node.attrs['kind'] as AiChatArtefactChipAttrs['kind']) || 'task',
        id: String(node.attrs['id'] ?? ''),
        label: String(node.attrs['label'] ?? ''),
        number: Number(node.attrs['number'] ?? 0),
      });
      return true;
    });
    return chips;
  }

  nextArtefactNumber(): number {
    const numbers = this.listArtefacts().map((chip) => chip.number);
    return numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
  }

  private createEditor(): void {
    const element = this.host().nativeElement;
    this.editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          bold: false,
          italic: false,
          heading: false,
          blockquote: false,
          horizontalRule: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          codeBlock: false,
        }),
        ChatBold,
        ChatItalic,
        AiChatArtefactChip,
        Placeholder.configure({
          placeholder: () => this.placeholder(),
        }),
        Markdown.configure({
          html: false,
          breaks: true,
          transformPastedText: true,
          transformCopiedText: true,
        }),
      ],
      content: '',
      editable: !this.disabled(),
      editorProps: {
        attributes: {
          id: 'ai-chat-input',
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': 'Message Skemex AI',
          class: 'ai-md-input__editor',
        },
        handleKeyDown: (view, event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.submit.emit();
            return true;
          }

          if (event.key === ' ' && this.mentionAt != null && !event.metaKey) {
            this.mentionAt = null;
            this.mentionDismiss.emit();
            return false;
          }

          // Allow AltGr (ctrl+alt) layouts that produce `@`.
          if (event.key === '@' && !event.metaKey) {
            const { from } = view.state.selection;
            const textBefore = view.state.doc.textBetween(0, from, '\n', '\n');
            if (isMentionShortcutBoundary(textBefore)) {
              // Keep `@` in the editor; open the menu from onUpdate after insert.
              this.pendingMentionOpen = true;
              return false;
            }
          }

          return false;
        },
      },
      onUpdate: () => {
        if (this.syncingFromParent) {
          return;
        }

        if (this.pendingMentionOpen) {
          this.pendingMentionOpen = false;
          const cursor = this.editor?.state.selection.from ?? 0;
          const at = cursor - 1;
          if (at >= 0 && this.charAt(at) === '@') {
            this.mentionAt = at;
            this.mentionShortcut.emit();
          }
        } else if (this.mentionAt != null && this.resolveMentionAt() == null) {
          this.mentionAt = null;
          this.mentionDismiss.emit();
        }

        this.markdownChange.emit(this.readMarkdown());
      },
    });
  }

  private charAt(pos: number): string | null {
    const editor = this.editor;
    if (!editor || pos < 0) {
      return null;
    }
    const size = editor.state.doc.content.size;
    if (pos + 1 > size) {
      return null;
    }
    try {
      return editor.state.doc.textBetween(pos, pos + 1);
    } catch {
      return null;
    }
  }

  /** Returns the live `@` trigger position if it is still present in the doc. */
  private resolveMentionAt(): number | null {
    const at = this.mentionAt;
    if (at == null || this.charAt(at) !== '@') {
      return null;
    }
    return at;
  }

  private readMarkdown(): string {
    if (!this.editor) {
      return '';
    }
    // Custom serializer — tiptap-markdown emits useless `[artefactChip]` stubs.
    return serializeAiChatDoc(this.editor.state.doc);
  }
}

/**
 * `@` opens the mention menu only at start-of-input or after whitespace.
 * Skips mid-token cases like `email@example.com`.
 */
function isMentionShortcutBoundary(textBeforeCursor: string): boolean {
  if (textBeforeCursor.length === 0) {
    return true;
  }

  if (/^\s*$/u.test(textBeforeCursor)) {
    return true;
  }

  const last = textBeforeCursor[textBeforeCursor.length - 1]!;
  return /\s/u.test(last);
}
