// The app's texts live in three files since the language split (2026-11-11):
// src/app/core/i18n/translations.ts (keys), en.ts (English), ar.ts (Arabic); language.service.ts has the helpers.
// readLang() returns them joined, so the checks can read them the way they read the single file before.
import fs from 'node:fs';
export const LANG_FILES = {
  keys: 'src/app/core/i18n/translations.ts',
  en: 'src/app/core/i18n/en.ts',
  ar: 'src/app/core/i18n/ar.ts',
  service: 'src/app/core/services/language.service.ts',
};
export const readLang = () => Object.values(LANG_FILES).map((f) => fs.readFileSync(f, 'utf8')).join('\n').replace(/\r\n/g, '\n');
/** true for the language files themselves (checks skip them when looking for texts in pages) */
export const isLangFile = (p) => /language\.service\.ts$|[\/]core[\/]i18n[\/](en|ar|translations)\.ts$/.test(p);
