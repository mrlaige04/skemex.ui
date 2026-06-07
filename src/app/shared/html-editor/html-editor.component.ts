import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { html } from '@codemirror/lang-html';
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { HlmButtonImports } from 'spartan/button';

type HtmlEditorViewMode = 'edit' | 'preview';

const SAMPLE_PLACEHOLDERS: Record<string, string> = {
  Name: 'Alex',
  LoginUrl: 'https://app.skemex.com/login',
  TenantName: 'Acme Corp',
  AcceptUrl: 'https://app.skemex.com/invite/accept',
  ExpiryDays: '7',
  Code: '123456',
  ExpiryMinutes: '15',
};

const htmlHighlightStyle = HighlightStyle.define([
  { tag: t.tagName, color: '#7dd3fc' },
  { tag: t.angleBracket, color: '#94a3b8' },
  { tag: t.attributeName, color: '#fcd34d' },
  { tag: t.attributeValue, color: '#86efac' },
  { tag: t.string, color: '#86efac' },
  { tag: t.comment, color: '#64748b', fontStyle: 'italic' },
  { tag: t.meta, color: '#c4b5fd' },
  { tag: t.processingInstruction, color: '#94a3b8' },
  { tag: t.special(t.brace), color: '#94a3b8' },
]);

@Component({
  selector: 'app-html-editor',
  imports: [...HlmButtonImports],
  templateUrl: './html-editor.component.html',
  styleUrl: './html-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HtmlEditorComponent implements AfterViewInit, OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);

  readonly value = input('');
  readonly disabled = input(false);
  readonly valueChange = output<string>();

  readonly viewMode = signal<HtmlEditorViewMode>('edit');
  readonly content = signal('');

  private readonly editorHost = viewChild.required<ElementRef<HTMLDivElement>>('editorHost');
  private editorView?: EditorView;
  private suppressExternalSync = false;
  private lastEmittedValue = '';
  private readonly editableCompartment = new Compartment();

  readonly previewHtml = computed(() => applySamplePlaceholders(this.content()));
  readonly previewSrcdoc = computed((): SafeHtml =>
    this.sanitizer.bypassSecurityTrustHtml(this.previewHtml()),
  );

  constructor() {
    effect(() => {
      const next = this.value();
      if (this.suppressExternalSync || next === this.lastEmittedValue) {
        return;
      }
      this.content.set(next);
      this.syncEditorDocument(next);
    });

    effect(() => {
      const isDisabled = this.disabled();
      if (!this.editorView) {
        return;
      }
      this.editorView.dispatch({
        effects: this.editableCompartment.reconfigure(EditorView.editable.of(!isDisabled)),
      });
    });
  }

  ngAfterViewInit(): void {
    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) {
        return;
      }

      const next = update.state.doc.toString();
      this.suppressExternalSync = true;
      this.lastEmittedValue = next;
      this.content.set(next);
      this.valueChange.emit(next);
      queueMicrotask(() => {
        this.suppressExternalSync = false;
      });
    });

    this.editorView = new EditorView({
      state: EditorState.create({
        doc: this.value(),
        extensions: [
          lineNumbers(),
          EditorView.lineWrapping,
          html(),
          indentUnit.of('  '),
          syntaxHighlighting(htmlHighlightStyle),
          history(),
          keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
          updateListener,
          this.editableCompartment.of(EditorView.editable.of(!this.disabled())),
          EditorView.theme({
            '&': {
              width: '100%',
              maxWidth: '100%',
              fontSize: '15px',
              lineHeight: '1.55',
              backgroundColor: 'transparent',
            },
            '.cm-scroller': {
              overflow: 'auto',
              minHeight: '420px',
              maxHeight: 'min(480px, 60vh)',
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
            },
            '.cm-content': {
              padding: '8px 0',
              caretColor: 'var(--foreground)',
            },
            '.cm-gutters': {
              backgroundColor: 'transparent',
              borderRight: '1px solid var(--border)',
              color: 'var(--muted-foreground)',
              minHeight: '420px',
            },
            '.cm-lineNumbers .cm-gutterElement': {
              padding: '0 10px 0 6px',
              minWidth: '2.75rem',
            },
            '.cm-activeLineGutter': {
              backgroundColor: 'color-mix(in oklch, var(--muted) 40%, transparent)',
            },
            '.cm-activeLine': {
              backgroundColor: 'color-mix(in oklch, var(--muted) 25%, transparent)',
            },
            '&.cm-focused .cm-selectionBackground, ::selection': {
              backgroundColor: 'color-mix(in oklch, var(--primary) 30%, transparent) !important',
            },
          }),
        ],
      }),
      parent: this.editorHost().nativeElement,
    });

    this.content.set(this.value());
  }

  ngOnDestroy(): void {
    this.editorView?.destroy();
  }

  setViewMode(mode: HtmlEditorViewMode): void {
    if (mode === 'preview') {
      this.syncContentFromEditor();
    }
    this.viewMode.set(mode);
    if (mode === 'edit') {
      queueMicrotask(() => this.editorView?.requestMeasure());
    }
  }

  private syncContentFromEditor(): void {
    if (!this.editorView) {
      return;
    }

    const next = this.editorView.state.doc.toString();
    if (next === this.content()) {
      return;
    }

    this.suppressExternalSync = true;
    this.lastEmittedValue = next;
    this.content.set(next);
    this.valueChange.emit(next);
    queueMicrotask(() => {
      this.suppressExternalSync = false;
    });
  }

  private syncEditorDocument(next: string): void {
    if (!this.editorView) {
      return;
    }

    const current = this.editorView.state.doc.toString();
    if (current === next) {
      return;
    }

    this.editorView.dispatch({
      changes: { from: 0, to: current.length, insert: next },
    });
  }
}

function applySamplePlaceholders(source: string): string {
  return source.replace(/\{\{(\w+)\}\}/g, (match, key: string) => SAMPLE_PLACEHOLDERS[key] ?? match);
}
