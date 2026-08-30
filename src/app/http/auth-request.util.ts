const AUTH_ANONYMOUS_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'] as const;

export function isAuthAnonymousRequest(url: string): boolean {
  if (AUTH_ANONYMOUS_PATHS.some((path) => url.includes(path))) {
    return true;
  }

  if (isPublicBlobRequest(url)) {
    return true;
  }

  if (isPresignedObjectStorageUrl(url)) {
    return true;
  }

  return false;
}

function isPublicBlobRequest(url: string): boolean {
  return url.includes('/api/blobs/') || url.includes('/blobs/');
}

function isPresignedObjectStorageUrl(url: string): boolean {
  try {
    const parsed = new URL(url, 'http://localhost');
    return (
      parsed.searchParams.has('X-Amz-Algorithm')
      || parsed.searchParams.has('X-Amz-Signature')
    );
  } catch {
    return url.includes('X-Amz-Algorithm=') || url.includes('X-Amz-Signature=');
  }
}
