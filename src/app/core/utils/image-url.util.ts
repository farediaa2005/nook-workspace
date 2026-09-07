/**
 * Utility for resolving server, local, and data image URLs safely across the app.
 */
export function resolveImageUrl(url?: string | null, defaultFallback: string = ''): string {
  if (!url || typeof url !== 'string') return defaultFallback;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return defaultFallback;

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
    trimmed.startsWith('/images/rooms/') ||
    trimmed.startsWith('/images/logo') ||
    trimmed.startsWith('/images/login-bg') ||
    trimmed.startsWith('/favicon.ico')
  ) {
    return trimmed;
  }

  // 5. Backend relative uploads/images
  const cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  const backendBase = 'https://nook.runasp.net';
  return `${backendBase}/${cleanPath}`;
}

const PRODUCT_IMAGE_CACHE_PREFIX = 'nook_product_img_';

export function getProductImageCache(id: string): string | null {
  if (!id) return null;
  try {
    return localStorage.getItem(`${PRODUCT_IMAGE_CACHE_PREFIX}${id}`) || null;
  } catch {
    return null;
  }
}

export function setProductImageCache(id: string, imageSrc: string): void {
  if (!id || !imageSrc) return;
  try {
    localStorage.setItem(`${PRODUCT_IMAGE_CACHE_PREFIX}${id}`, imageSrc);
  } catch {}
}
