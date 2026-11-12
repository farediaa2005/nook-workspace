// C4 wording: counts formal-Arabic (فصحى) patterns in the Arabic values of the language file, to plan the
// Egyptian-dialect pass. Usage: node audit/scripts/i18n-msa-scan.mjs [pattern-name]  (lists the matches)
import { readLang, isLangFile } from './lang-src.mjs';
import fs from 'node:fs';
const lang = readLang().replace(/\r\n/g, '\n');
const ar = (lang.match(/\n {2}ar: \{\n([\s\S]*?)\n {2}\}/) || [])[1] || '';
const rows = [...ar.matchAll(/^ {4}([A-Za-z_]\w*): '((?:[^'\\]|\\.)*)',?$/gm)].map((m) => [m[1], m[2]]);
export const PATTERNS = {
  'هل أنت متأكد': /هل (أنت|انت) متأكد/,
  'يرجى': /يرجى|يُرجى|الرجاء/,
  'لا يمكن': /لا يمكن|لا يُمكن/,
  'لا يوجد/لا توجد': /لا (يوجد|توجد)/,
  'حدث خطأ': /حدث خطأ/,
  'تعذّر/فشل': /تعذّر|تعذر|فشل/,
  'هذا/هذه': /(^|\s)(هذا|هذه)(\s|$)/,
  'يجب': /يجب/,
  'الآن/حالياً': /الآن|حالياً|حاليًا/,
  'سيتم': /سيتم/,
  'لم يتم': /لم يتم/,
  'أولاً': /أولاً|أولًا/,
  'تم … بنجاح': /تم .*بنجاح/,
};
const pick = process.argv[2];
for (const [name, re] of Object.entries(PATTERNS)) {
  const hits = rows.filter(([, v]) => re.test(v));
  console.log(`${String(hits.length).padStart(4)}  ${name}`);
  if (pick === name) for (const [k, v] of hits) console.log(`      ${k}: ${v}`);
}
console.log(`${rows.length} Arabic values`);
