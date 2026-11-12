// Language file health: keys per language, keys missing in one language, keys nothing uses,
// and Arabic strings containing the broken "امسح" construction (from an old global replace).
// Usage: node audit/scripts/i18n-audit.mjs [--json]
import { readLang, isLangFile } from './lang-src.mjs';
import fs from 'node:fs';
import path from 'node:path';

const src = readLang().replace(/\r\n/g, '\n');
// language objects: "  en: {" … "  }," and "  ar: {" … "  }"
const block = (lang) => {
  const start = src.search(new RegExp(`\\n(?:const \\w+\\s*:\\s*Translations\\s*=|\\s{2}${lang}\\s*:)\\s*\\{`, 'm'));
  return start;
};
const objects = [...src.matchAll(/\n {2}(en|ar): \{\n([\s\S]*?)\n {2}\}/g)].map((m) => ({ lang: m[1], body: m[2] }));
const keysOf = (body) => new Map([...body.matchAll(/^\s{4}([A-Za-z_][\w]*)\s*:\s*([\s\S]*?),?\s*$/gm)].map((m) => [m[1], m[2]]));
const langs = Object.fromEntries(objects.map((o) => [o.lang, keysOf(o.body)]));
const en = langs.en || new Map();
const ar = langs.ar || new Map();
const missingInAr = [...en.keys()].filter((k) => !ar.has(k));
const missingInEn = [...ar.keys()].filter((k) => !en.has(k));

// usage: t().key / t()['key'] / translations.key / .key in templates with t()
const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(ts|html)$/.test(p) && !isLangFile(p) && !p.endsWith('.spec.ts')) files.push(p); } };
walk('src/app');
// the language service's own helpers (hoursText …) also use keys: its code outside the two dictionaries counts
const serviceCode = src.replace(/\n {2}(en|ar): \{\n[\s\S]*?\n {2}\}/g, '');
const corpus = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n') + '\n' + serviceCode.slice(serviceCode.search(/^export class LanguageService/m));
const used = new Set([...corpus.matchAll(/\.([A-Za-z_]\w*)/g)].map((m) => m[1]));
const quoted = new Set([...corpus.matchAll(/['"`]([A-Za-z_]\w*)['"`]/g)].map((m) => m[1]));
const unused = [...en.keys()].filter((k) => !used.has(k) && !quoted.has(k));

const broken = [...ar.entries()].filter(([, v]) => /(تأكيد|من|عايز|متأكد\S*)\s+امسح|امسح\s+(ال)?\S+\s+نهائيا|اامسح/.test(v)).map(([k, v]) => `${k}: ${v.trim()}`);

const out = { keysEn: en.size, keysAr: ar.size, missingInAr: missingInAr.length, missingInEn: missingInEn.length, unused: unused.length, brokenAr: broken.length };
if (process.argv.includes('--json')) {
  fs.mkdirSync('audit/logs/i18n', { recursive: true });
  fs.writeFileSync('audit/logs/i18n/audit.json', JSON.stringify({ ...out, missingInAr, missingInEn, unused, broken }, null, 1));
}
console.log(JSON.stringify(out));
console.log('missing in ar (first 10):', missingInAr.slice(0, 10).join(', '));
console.log('missing in en (first 10):', missingInEn.slice(0, 10).join(', '));
console.log('broken ar (first 15):\n  ' + broken.slice(0, 15).join('\n  '));
