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

/**
 * Quill 2 stores lists as `<ol><li data-list="bullet|ordered">…</li></ol>` and
 * draws markers only inside a live editor. Convert to semantic `<ul>` / `<ol>`
 * so read-only views show real bullets/numbers under Tailwind preflight.
 */
export function prepareQuillHtmlForDisplay(html: string | null | undefined): string {
  const normalized = normalizeRichHtml(html);
  if (!normalized || typeof document === 'undefined') {
    return normalized;
  }

  const root = document.createElement('div');
  root.innerHTML = normalized;
  convertQuillListsToSemantic(root);
  return root.innerHTML;
}

function convertQuillListsToSemantic(root: HTMLElement): void {
  const quillLists = Array.from(root.querySelectorAll('ol')).filter((ol) =>
    Boolean(ol.querySelector(':scope > li[data-list]')),
  );

  for (const ol of quillLists) {
    const fragment = document.createDocumentFragment();
    let currentKind: 'bullet' | 'ordered' | null = null;
    let currentList: HTMLElement | null = null;

    for (const child of Array.from(ol.children)) {
      if (child.tagName !== 'LI') {
        fragment.appendChild(child.cloneNode(true));
        currentKind = null;
        currentList = null;
        continue;
      }

      const source = child as HTMLLIElement;
      const dataList = source.getAttribute('data-list') ?? 'bullet';
      const kind: 'bullet' | 'ordered' = dataList === 'ordered' ? 'ordered' : 'bullet';
      const tag = kind === 'ordered' ? 'ol' : 'ul';

      if (currentKind !== kind || !currentList) {
        currentKind = kind;
        currentList = document.createElement(tag);
        fragment.appendChild(currentList);
      }

      const item = document.createElement('li');
      for (const className of Array.from(source.classList)) {
        if (className.startsWith('ql-indent') || className.startsWith('ql-direction') || className.startsWith('ql-align')) {
          item.classList.add(className);
        }
      }

      for (const node of Array.from(source.childNodes)) {
        if (node instanceof HTMLElement && node.classList.contains('ql-ui')) {
          continue;
        }
        item.appendChild(node.cloneNode(true));
      }

      if (dataList === 'checked') {
        item.prepend(document.createTextNode('☑ '));
      } else if (dataList === 'unchecked') {
        item.prepend(document.createTextNode('☐ '));
      }

      currentList.appendChild(item);
    }

    ol.replaceWith(fragment);
  }
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
