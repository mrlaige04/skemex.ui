import type { AiChatArtefactKind } from './ai-chat-artefact-chip.extension';

/** `{artefact:N}` or `{artefact:N|kind|label}` (label may contain escaped chars). */
const ARTEFACT_TOKEN_RE =
  /\{artefact:(\d+)(?:\|(task|user|document)\|((?:\\.|[^}\\])*))?\}/gi;

const LEGACY_ARTEFACT_CHIP_RE = /\[artefactChip\]/gi;

export function escapeArtefactLabel(label: string): string {
  return label.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\}/g, '\\}');
}

export function unescapeArtefactLabel(label: string): string {
  return label.replace(/\\([\\|}\\])/g, '$1');
}

/** Serialize a chip for storage / prompt (self-describing for message badges). */
export function formatArtefactToken(attrs: {
  number: number;
  kind: string;
  label: string;
}): string {
  const number =
    Number.isFinite(attrs.number) && attrs.number > 0 ? Math.trunc(attrs.number) : 1;
  const kind = normalizeArtefactKind(attrs.kind);
  const label = escapeArtefactLabel((attrs.label ?? '').trim());
  return `{artefact:${number}|${kind}|${label}}`;
}

export function normalizeArtefactKind(kind: string | null | undefined): AiChatArtefactKind {
  const value = (kind ?? '').trim().toLowerCase();
  if (value === 'user' || value === 'document') {
    return value;
  }
  return 'task';
}

/** Escape text for safe insertion into HTML text nodes / attributes. */
export function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function artefactChipHtml(attrs: {
  number: number;
  kind: string;
  label: string;
  id?: string;
}): string {
  const kind = normalizeArtefactKind(attrs.kind);
  const label = (attrs.label ?? '').trim() || `Artefact ${attrs.number}`;
  const id = (attrs.id ?? '').trim();
  const safeLabel = escapeHtmlText(label);
  const safeId = escapeHtmlText(id);
  return (
    `<span data-artefact-chip="" data-kind="${kind}" data-id="${safeId}" data-label="${safeLabel}" ` +
    `data-number="${attrs.number}" class="ai-md-chip ai-md-chip--${kind}" contenteditable="false">` +
    `<span class="ai-md-chip__icon" aria-hidden="true"></span>` +
    `<span class="ai-md-chip__label">${safeLabel}</span>` +
    `</span>`
  );
}

const PLACEHOLDER_PREFIX = '@@SKEMEXARTEFACT';
const PLACEHOLDER_SUFFIX = '@@';

function artefactPlaceholder(index: number): string {
  return `${PLACEHOLDER_PREFIX}${index}${PLACEHOLDER_SUFFIX}`;
}

/** Pull artefact tokens out of markdown so marked cannot mangle them. */
export function extractArtefactTokens(source: string): {
  text: string;
  tokens: string[];
} {
  const tokens: string[] = [];
  // Convert legacy TipTap stubs into displayable chips (label unknown).
  let text = source.replace(LEGACY_ARTEFACT_CHIP_RE, () => {
    const index = tokens.length;
    tokens.push(formatArtefactToken({ number: index + 1, kind: 'document', label: 'Artefact' }));
    return artefactPlaceholder(index);
  });
  text = text.replace(ARTEFACT_TOKEN_RE, (match) => {
    const index = tokens.length;
    tokens.push(match);
    return artefactPlaceholder(index);
  });
  return { text, tokens };
}

/** Restore protected placeholders as chip HTML after markdown rendering. */
export function replaceArtefactPlaceholdersWithChipHtml(
  html: string,
  tokens: string[],
): string {
  if (tokens.length === 0) {
    return html;
  }

  let result = html;
  for (let index = 0; index < tokens.length; index += 1) {
    const placeholder = artefactPlaceholder(index);
    const chipHtml = replaceArtefactTokensWithChipHtml(tokens[index]!);
    result = result.split(placeholder).join(chipHtml);
  }
  return result;
}

/** Replace artefact tokens (and legacy TipTap stubs) with chip HTML. */
export function replaceArtefactTokensWithChipHtml(source: string): string {
  let index = 0;
  const withLegacyAsTokens = source.replace(LEGACY_ARTEFACT_CHIP_RE, () => {
    index += 1;
    return formatArtefactToken({ number: index, kind: 'document', label: 'Artefact' });
  });
  return withLegacyAsTokens.replace(
    ARTEFACT_TOKEN_RE,
    (_match, numberRaw: string, kindRaw?: string, labelRaw?: string) => {
      const number = Number(numberRaw);
      const kind = normalizeArtefactKind(kindRaw);
      const label = labelRaw != null ? unescapeArtefactLabel(labelRaw) : `Artefact ${number}`;
      return artefactChipHtml({ number, kind, label });
    },
  );
}
