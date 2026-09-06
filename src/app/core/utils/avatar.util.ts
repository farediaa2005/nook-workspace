/**
 * Dynamic Avatar and Initials Generator Utility.
 * Generates lightweight, offline-ready SVG avatars with deterministic colors and smooth rounded corners.
 */

/**
 * Extracts 1-2 character uppercase initials from any name (Latin or Arabic).
 */
export function getUserInitials(name?: string): string {
  if (!name) return 'U';
  const clean = name.trim();
  if (!clean) return 'U';

  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = Array.from(parts[0])[0] || '';
    const second = Array.from(parts[1])[0] || '';
    return (first + second).toUpperCase();
  }

  const chars = Array.from(clean);
  if (chars.length >= 2) {
    return (chars[0] + chars[1]).toUpperCase();
  }
  return (chars[0] || 'U').toUpperCase();
}

/**
 * Deterministic modern color palette for avatars
 */
export function getAvatarColors(name?: string): { bg: string; text: string; border: string } {
  const cleanName = (name || 'User').trim();
  const colors = [
    { bg: '#2563EB', text: '#FFFFFF', border: '#3B82F6' }, // Blue
    { bg: '#059669', text: '#FFFFFF', border: '#10B981' }, // Emerald
    { bg: '#D97706', text: '#FFFFFF', border: '#F59E0B' }, // Amber
    { bg: '#7C3AED', text: '#FFFFFF', border: '#8B5CF6' }, // Purple
    { bg: '#DB2777', text: '#FFFFFF', border: '#EC4899' }, // Pink
    { bg: '#0891B2', text: '#FFFFFF', border: '#06B6D4' }, // Cyan
    { bg: '#E11D48', text: '#FFFFFF', border: '#F43F5E' }, // Rose
    { bg: '#4F46E5', text: '#FFFFFF', border: '#6366F1' }, // Indigo
    { bg: '#0D9488', text: '#FFFFFF', border: '#14B8A6' }, // Teal
    { bg: '#EA580C', text: '#FFFFFF', border: '#FB923C' }, // Orange
  ];

  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
}

/**
 * Generates a clean, modern SVG Data URI avatar based on the user's name.
 */
export function generateAvatarSvg(name?: string): string {
  const cleanName = (name || 'User').trim();
  const initials = getUserInitials(cleanName);
  const { bg, text } = getAvatarColors(cleanName);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="${bg}"/><text x="50" y="52" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Arabic', sans-serif" font-size="36" font-weight="700" fill="${text}" text-anchor="middle" dominant-baseline="central">${initials}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getSafeAvatar(avatar?: string | null, name?: string): string {
  if (
    avatar &&
    typeof avatar === 'string' &&
    avatar.trim() !== '' &&
    !avatar.includes('assets/avatar.png') &&
    !avatar.includes('undefined') &&
    !avatar.includes('null') &&
    (avatar.startsWith('http') || avatar.startsWith('data:image/') || avatar.startsWith('/images/'))
  ) {
    return avatar.trim();
  }
  return generateAvatarSvg(name);
}
