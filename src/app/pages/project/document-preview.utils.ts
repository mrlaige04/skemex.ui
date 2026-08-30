export type DocumentPreviewKind = 'pdf' | 'docx' | 'image' | 'text' | 'unsupported';

export function resolveAbsoluteDownloadUrl(downloadUrl: string, apiBaseUrl: string): string {
  const trimmed = downloadUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const base = apiBaseUrl.replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

export function resolveDocumentPreviewKind(
  fileName: string,
  contentType: string,
): DocumentPreviewKind {
  const extension = fileName.includes('.')
    ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
    : '';
  const type = contentType.trim().toLowerCase();

  if (type === 'application/pdf' || extension === '.pdf') {
    return 'pdf';
  }

  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || extension === '.docx'
  ) {
    return 'docx';
  }

  if (
    type.startsWith('image/')
    || extension === '.png'
    || extension === '.jpg'
    || extension === '.jpeg'
    || extension === '.gif'
    || extension === '.webp'
    || extension === '.svg'
    || extension === '.bmp'
  ) {
    return 'image';
  }

  if (type.startsWith('text/') || extension === '.txt' || extension === '.log' || extension === '.md') {
    return 'text';
  }

  return 'unsupported';
}
