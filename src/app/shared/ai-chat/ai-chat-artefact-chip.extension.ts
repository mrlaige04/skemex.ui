import { mergeAttributes, Node } from '@tiptap/core';
import {
  formatArtefactToken,
  normalizeArtefactKind,
} from './ai-chat-artefact-token.util';

export type AiChatArtefactKind = 'task' | 'user' | 'document';

export interface AiChatArtefactChipAttrs {
  kind: AiChatArtefactKind;
  id: string;
  label: string;
  number: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    artefactChip: {
      insertArtefactChip: (attrs: AiChatArtefactChipAttrs) => ReturnType;
    };
  }
}

/** Inline Cursor-style chip; serializes via tiptap-markdown `storage.markdown`. */
export const AiChatArtefactChip = Node.create({
  name: 'artefactChip',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      kind: { default: 'task' },
      id: { default: '' },
      label: { default: '' },
      number: { default: 1 },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-artefact-chip]',
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) {
            return false;
          }
          const number = Number(el.getAttribute('data-number') || '1');
          return {
            kind: normalizeArtefactKind(el.getAttribute('data-kind')),
            id: el.getAttribute('data-id') || '',
            label: el.getAttribute('data-label') || el.textContent || '',
            number: Number.isFinite(number) && number > 0 ? number : 1,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const kind = normalizeArtefactKind(String(node.attrs['kind'] ?? 'task'));
    const label = String(node.attrs['label'] ?? '');
    const id = String(node.attrs['id'] ?? '');
    const number = Number(node.attrs['number'] ?? 1);
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-artefact-chip': '',
        'data-kind': kind,
        'data-id': id,
        'data-label': label,
        'data-number': String(number),
        class: `ai-md-chip ai-md-chip--${kind}`,
        contenteditable: 'false',
      }),
      ['span', { class: 'ai-md-chip__icon', 'aria-hidden': 'true' }],
      ['span', { class: 'ai-md-chip__label' }, label],
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (text: string) => void },
          node: { attrs: Record<string, unknown> },
        ) {
          state.write(
            formatArtefactToken({
              number: Number(node.attrs['number'] ?? 1),
              kind: String(node.attrs['kind'] ?? 'task'),
              label: String(node.attrs['label'] ?? ''),
            }),
          );
        },
        parse: {},
      },
    };
  },

  addCommands() {
    return {
      insertArtefactChip:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              kind: attrs.kind,
              id: attrs.id,
              label: attrs.label,
              number: attrs.number,
            },
          }),
    };
  },
});
