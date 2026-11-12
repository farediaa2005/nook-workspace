// Prints lint errors grouped by file from audit/logs/lint.json
import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync('audit/logs/lint.json', 'utf8'));
let e = 0, w = 0;
const by = {};
for (const f of r) {
  for (const m of f.messages) {
    if (m.severity !== 2) { w++; continue; }
    e++;
    const k = f.filePath.split(/Frontend[\\/]/).pop().replace(/\\/g, '/');
    const label = m.ruleId === '@typescript-eslint/no-unused-vars' ? (m.message.match(/'([^']+)'/) || [])[1] : m.ruleId;
    (by[k] ||= []).push(`${m.line}:${label}`);
  }
}
console.log('errors', e, 'warnings', w);
for (const [k, v] of Object.entries(by)) console.log(k, '=>', v.join(', '));
