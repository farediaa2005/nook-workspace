// Lists every remaining `isArabic() ? A : B` expression with its two branches, classified:
//   code     – no Arabic letters on either side (direction, locale, SVG …) → stays
//   template – both sides are `…` template literals or 'a' + x + 'b' concatenations → parameterised key
//   nested   – a branch contains another ternary / call
// Usage: node audit/scripts/i18n-remaining.mjs [--list]   → audit/logs/i18n/remaining.json
import { readLang, isLangFile } from './lang-src.mjs';
import fs from 'node:fs';
import path from 'node:path';

const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(ts|html)$/.test(p) && !p.endsWith('.spec.ts') && !isLangFile(p)) files.push(p); } };
walk('src/app');

// read one ternary branch starting at i: balanced (), [], {}, quotes and template literals; stops at ':' or
// the end of the expression (depth 0 ')' ']' '}' ',' ';' '"' (attribute end) or newline + '}}')
function branch(s, i, stopAtColon) {
  let depth = 0, q = null, start = i;
  for (; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '`') { q = c; continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) { if (depth === 0) break; depth--; }
    else if (depth === 0 && (c === ',' || c === ';' || c === '"')) break;
    else if (depth === 0 && c === '?' && s[i + 1] !== '.' && s[i + 1] !== '?') depth += 0; // nested ternary stays inside
    else if (depth === 0 && stopAtColon && c === ':') break;
    if (s.startsWith('}}', i) && depth === 0) break;
  }
  return { text: s.slice(start, i).trim(), end: i };
}

const out = [];
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const re = /isArabic\(\)\s*\?/g;
  let m;
  while ((m = re.exec(s))) {
    const a = branch(s, m.index + m[0].length, true);
    if (s[a.end] !== ':') continue;
    const b = branch(s, a.end + 1, false);
    const both = a.text + ' ' + b.text;
    const kind = !/[؀-ۿ]/.test(both) ? 'code'
      : (/\?/.test(a.text) || /\?/.test(b.text)) ? 'nested'
      : (/^`[\s\S]*`$/.test(a.text) || /'\s*\+|\+\s*'/.test(a.text)) ? 'template'
      : 'other';
    out.push({ file: f.replace(/^.*app[\\/]/, ''), line: s.slice(0, m.index).split('\n').length, kind, ar: a.text.slice(0, 160), en: b.text.slice(0, 160) });
  }
}
fs.mkdirSync('audit/logs/i18n', { recursive: true });
fs.writeFileSync('audit/logs/i18n/remaining.json', JSON.stringify(out, null, 1));
const count = out.reduce((acc, r) => { acc[r.kind] = (acc[r.kind] || 0) + 1; return acc; }, {});
console.log(JSON.stringify({ total: out.length, ...count }));
if (process.argv.includes('--list')) for (const r of out.filter((x) => x.kind !== 'code').slice(0, Number(process.argv[3] || 40))) console.log(`${r.kind.padEnd(8)} ${r.file}:${r.line}\n   AR ${r.ar}\n   EN ${r.en}`);
