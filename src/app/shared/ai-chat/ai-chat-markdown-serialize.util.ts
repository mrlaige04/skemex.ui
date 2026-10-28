import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { formatArtefactToken } from './ai-chat-artefact-token.util';

/**
 * Serialize the composer doc to markdown with artefact chips as
 * `{artefact:N|kind|label}` — does not rely on tiptap-markdown node serializers.
 */
export function serializeAiChatDoc(doc: ProseMirrorNode): string {
  const blocks: string[] = [];
  doc.forEach((block) => {
    blocks.push(serializeBlock(block));
  });
  return blocks.join('\n\n').trim();
}

function serializeBlock(node: ProseMirrorNode): string {
  if (node.type.name === 'paragraph' || node.type.name === 'heading') {
    return serializeInline(node);
  }
  if (node.type.name === 'blockquote') {
    return serializeInline(node)
      .split('\n')
      .map((line) => (line.trim() ? `> ${line}` : '>'))
      .join('\n');
  }
  if (node.type.name === 'codeBlock') {
    return `\`\`\`\n${node.textContent}\n\`\`\``;
  }
  if (node.type.name === 'horizontalRule') {
    return '---';
  }
  if (node.type.name === 'bulletList' || node.type.name === 'orderedList') {
    const lines: string[] = [];
    let index = 1;
    node.forEach((item) => {
      const prefix = node.type.name === 'orderedList' ? `${index}. ` : '- ';
      lines.push(`${prefix}${serializeInline(item).trim()}`);
      index += 1;
    });
    return lines.join('\n');
  }
  return serializeInline(node);
}

function serializeInline(node: ProseMirrorNode): string {
  let out = '';
  node.forEach((child) => {
    if (child.isText) {
      out += wrapMarks(child.text ?? '', child.marks.map((mark) => mark.type.name));
      return;
    }
    if (child.type.name === 'artefactChip') {
      out += formatArtefactToken({
        number: Number(child.attrs['number'] ?? 1),
        kind: String(child.attrs['kind'] ?? 'task'),
        label: String(child.attrs['label'] ?? ''),
      });
      return;
    }
    if (child.type.name === 'hardBreak') {
      out += '\n';
      return;
    }
    out += serializeInline(child);
  });
  return out;
}

function wrapMarks(text: string, markNames: string[]): string {
  let result = text;
  if (markNames.includes('code')) {
    result = `\`${result}\``;
  }
  if (markNames.includes('bold')) {
    result = `**${result}**`;
  }
  if (markNames.includes('italic')) {
    result = `__${result}__`;
  }
  if (markNames.includes('strike')) {
    result = `~~${result}~~`;
  }
  return result;
}
