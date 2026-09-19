/** Quill (`format="html"`) empty-document shapes that should be stored as null/empty. */
const EMPTY_HTML_PATTERN =
  /^(?:<p>(?:<br\s*\/?>|&nbsp;|\s)*<\/p>|<p><\/p>|<br\s*\/?>|&nbsp;|\s)*$/i;

export function normalizeRichHtml(html: string | null | undefined): string {
  const raw = (html ?? '').trim();
  if (!raw || EMPTY_HTML_PATTERN.test(raw)) {
    return '';
  }
  return raw;
}

/** Plain-text preview for board cards / search snippets. */
export function stripHtmlToPlainText(html: string | null | undefined): string {
  const raw = (html ?? '').trim();
  if (!raw) {
    return '';
  }

  if (typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.innerHTML = raw;
    return (el.textContent ?? el.innerText ?? '').replace(/\s+/g, ' ').trim();
  }

  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
