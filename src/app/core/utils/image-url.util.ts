/**
 * Utility for resolving server, local, and data image URLs safely across the app.
 */
export function resolveImageUrl(url?: string | null, defaultFallback: string = ''): string {
  if (!url || typeof url !== 'string') return defaultFallback;
  let trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return defaultFallback;

  // Normalize Windows backslashes to standard forward slashes
  trimmed = trimmed.replace(/\\/g, '/');

  // 1. Data URLs & Blob URLs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // 2. Absolute HTTP/HTTPS
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // 3. Protocol-relative
  if (trimmed.startsWith('//')) {
    return 'https:' + trimmed;
  }

  // 4. Local Angular public assets
  if (
    trimmed.startsWith('/images/') ||
    trimmed.startsWith('images/') ||
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('assets/') ||
    trimmed.startsWith('/favicon.ico') ||
    trimmed.startsWith('favicon.ico')
  ) {
    return trimmed.startsWith('/') ? trimmed : '/' + trimmed;
  }

  // 5. Backend relative uploads/images
  const cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  
  // In local browser dev environment, use relative path so requests go through proxy.conf.json
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `/${cleanPath}`;
  }

  const backendBase = 'https://nook.runasp.net';
  return `${backendBase}/${cleanPath}`;
}

export const DEFAULT_ROOM_FALLBACK = '/images/rooms/room-workshop.jpg';
