// Adds keys to the language files (key list, English, Arabic) from a JSON file: [["key", "English", "Arabic"], …]
// Usage: node audit/scripts/i18n-add-keys.mjs <label> <file.json>
import fs from 'node:fs';
import { LANG_FILES } from './lang-src.mjs';
const [label, file] = process.argv.slice(2);
const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
const edit = (f, fn) => { let s = fs.readFileSync(f, 'utf8'); const crlf = s.includes('\r\n'); s = fn(s.replace(/\r\n/g, '\n')); fs.writeFileSync(f, crlf ? s.replace(/\n/g, '\r\n') : s); };
const existing = new Set([...fs.readFileSync(LANG_FILES.keys, 'utf8').replace(/\r\n/g, '\n').matchAll(/^ {2}([A-Za-z_]\w*)\??: string;$/gm)].map((m) => m[1]));
const clash = rows.filter(([k]) => existing.has(k)).map(([k]) => k);
if (clash.length) { console.log('keys exist:', clash.join(', ')); process.exit(1); }
const q = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
edit(LANG_FILES.keys, (s) => { const iEnd = s.indexOf('\n}', s.search(/^(export )?interface Translations \{/m)); return s.slice(0, iEnd) + `\n  // --- ${label} ---\n` + rows.map(([k]) => `  ${k}: string;`).join('\n') + s.slice(iEnd); });
for (const [name, idx] of [['en', 1], ['ar', 2]]) {
  edit(LANG_FILES[name], (s) => {
    const start = s.search(new RegExp(`\n {2}${name}: \{\n`));
    const end = s.indexOf('\n  }', start + 5);
    return s.slice(0, end).replace(/,?\s*$/, ',') + `\n    // --- ${label} ---\n` + rows.map((r) => `    ${r[0]}: '${q(r[idx])}',`).join('\n').replace(/,$/, '') + s.slice(end);
  });
}
fs.mkdirSync('audit/logs/i18n', { recursive: true }); // logs are kept locally (not in the repo)
fs.appendFileSync('audit/logs/i18n/extracted.tsv', rows.map(([k, en, ar]) => `${label}\t${k}\t${ar}\t${en}`).join('\n') + '\n');
console.log(`${rows.length} keys added`);
