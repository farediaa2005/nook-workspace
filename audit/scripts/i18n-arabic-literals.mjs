// Lists Arabic text still written in components/services (outside the language file), skipping comments.
// Usage: node audit/scripts/i18n-arabic-literals.mjs [--list N]
import { readLang, isLangFile } from './lang-src.mjs';
import fs from 'node:fs';
import path from 'node:path';
const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(ts|html)$/.test(p) && !p.endsWith('.spec.ts') && !isLangFile(p)) files.push(p); } };
walk('src/app');
const AR = /[؀-ۿ]/;
const out = [];
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  // blank out comments, keeping line numbers
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  s = f.endsWith('.html') ? s.replace(/<!--[\s\S]*?-->/g, blank) : s.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:'"`])\/\/.*$/gm, (m, a) => a + blank(m.slice(a.length)));
  s.split('\n').forEach((line, i) => { if (AR.test(line)) out.push({ file: f.replace(/^.*app[\/]/, ''), line: i + 1, text: line.trim().slice(0, 150) }); });
}
const byFile = {};
for (const r of out) byFile[r.file] = (byFile[r.file] || 0) + 1;
console.log(JSON.stringify({ lines: out.length, files: Object.keys(byFile).length }));
console.log(Object.entries(byFile).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${String(n).padStart(4)} ${f}`).join('\n'));
fs.writeFileSync('audit/logs/i18n/arabic-literals.json', JSON.stringify(out, null, 1));
const n = process.argv.includes('--list') ? Number(process.argv[process.argv.indexOf('--list') + 1] || 50) : 0;
for (const r of out.slice(0, n)) console.log(`${r.file}:${r.line}  ${r.text}`);
