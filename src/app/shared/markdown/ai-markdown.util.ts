import { marked } from 'marked';
import {
  extractArtefactTokens,
  replaceArtefactPlaceholdersWithChipHtml,
  replaceArtefactTokensWithChipHtml,
} from '../ai-chat/ai-chat-artefact-token.util';
import { normalizeRichHtml, stripHtmlToPlainText } from '../rich-text/rich-text.util';

marked.setOptions({
  gfm: true,
  breaks: true,
});

const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'hr',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'ul',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'rel', 'target']),
  span: new Set([
    'class',
    'data-artefact-chip',
    'data-kind',
    'data-id',
    'data-label',
    'data-number',
    'contenteditable',
    'aria-hidden',
  ]),
};

/** Render AI/chat markdown to a sanitized HTML string safe for `[innerHTML]`. */
export function renderAiMarkdown(source: string | null | undefined): string {
  const text = (source ?? '').trim();
  if (!text) {
    return '';
  }

  // Already-rich HTML (legacy / accidental) — sanitize only, then hydrate chips.
  if (/<[a-z][\s\S]*>/i.test(text) && !looksLikeMarkdown(text)) {
    return sanitizeAiHtml(replaceArtefactTokensWithChipHtml(text));
  }

  // Chat convention: __italic__ (marked/GFM would treat __ as bold).
  const normalized = text.replace(/(?<![_*])__([^_\n]+?)__(?![_*])/g, '_$1_');
  // Pull artefact tokens out before marked so `|` / braces are not mangled or escaped.
  const { text: protectedText, tokens } = extractArtefactTokens(normalized);
  const parsed = marked.parse(protectedText, { async: false });
  const sanitized = sanitizeAiHtml(typeof parsed === 'string' ? parsed : '');
  return replaceArtefactPlaceholdersWithChipHtml(sanitized, tokens);
}

export function looksLikeMarkdown(text: string): boolean {
  return /(^|\n)\s{0,3}(#{1,4}\s|[-*+]\s|\d+\.\s|>\s)|(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\([^)]+\))/m.test(
    text,
  );
}

/** Convert Quill HTML from the composer into markdown for storage / AI input. */
export function richHtmlToMarkdown(html: string | null | undefined): string {
  const normalized = normalizeRichHtml(html);
  if (!normalized) {
    return '';
  }

  if (typeof document === 'undefined') {
    return stripHtmlToPlainText(normalized);
  }

  const root = document.createElement('div');
  root.innerHTML = normalized;
  return serializeNode(root).replace(/\n{3,}/g, '\n\n').trim();
}

export function sanitizeAiHtml(html: string): string {
  if (typeof document === 'undefined') {
    return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  }

  const template = document.createElement('template');
  template.innerHTML = html;
  scrubNode(template.content);
  return template.innerHTML.trim();
}

function scrubNode(node: Node): void {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        const parent = el.parentNode;
        if (!parent) {
          continue;
        }
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
        scrubNode(node);
        return;
      }

      for (const attr of Array.from(el.attributes)) {
        const allowed = ALLOWED_ATTRS[tag];
        if (!allowed?.has(attr.name.toLowerCase())) {
          el.removeAttribute(attr.name);
        }
      }

      if (tag === 'a') {
        const href = el.getAttribute('href')?.trim() ?? '';
        if (!href || /^javascript:/i.test(href) || /^data:/i.test(href)) {
          el.removeAttribute('href');
        } else {
          el.setAttribute('rel', 'noopener noreferrer');
          el.setAttribute('target', '_blank');
        }
      }

      scrubNode(el);
    } else if (child.nodeType === Node.COMMENT_NODE) {
      child.parentNode?.removeChild(child);
    }
  }
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const children = Array.from(el.childNodes).map(serializeNode).join('');

  switch (tag) {
    case 'strong':
    case 'b':
      return `**${children}**`;
    case 'em':
    case 'i':
      return `*${children}*`;
    case 'code':
      return el.closest('pre') ? children : `\`${children}\``;
    case 'pre':
      return `\n\`\`\`\n${children.trim()}\n\`\`\`\n`;
    case 'br':
      return '\n';
    case 'p':
    case 'div':
      return `${children}\n\n`;
    case 'li':
      return `- ${children.trim()}\n`;
    case 'ul':
    case 'ol':
      return `${children}\n`;
    case 'blockquote':
      return (
        children
          .split('\n')
          .map((line) => (line.trim() ? `> ${line}` : ''))
          .join('\n') + '\n\n'
      );
    case 'h1':
      return `# ${children.trim()}\n\n`;
    case 'h2':
      return `## ${children.trim()}\n\n`;
    case 'h3':
      return `### ${children.trim()}\n\n`;
    case 'a': {
      const href = el.getAttribute('href')?.trim();
      return href ? `[${children}](${href})` : children;
    }
    case 'hr':
      return '\n---\n\n';
    default:
      return children;
  }
}
