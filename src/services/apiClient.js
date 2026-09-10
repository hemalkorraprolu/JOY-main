/**
 * API Client helper for environment-aware API requests.
 */

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

export function getApiUrl(path) {
  if (BACKEND_URL) {
    return `${BACKEND_URL}${path.startsWith('/') ? path : '/' + path}`;
  }
  return path;
}
