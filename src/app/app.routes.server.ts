import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Public marketing pages can SSR. Authenticated / API-backed shells use Client
 * so Node does not wait on backend HTTP (which hangs SSR stability).
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Server,
  },
  {
    path: 'pricing',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
