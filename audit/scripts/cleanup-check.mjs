// Checks one cleanup batch: build, lint, unit tests, then opens every page on the dev server (port 4300)
// and records console errors. Usage: node audit/scripts/cleanup-check.mjs <label>
// Writes audit/logs/cleanup/<label>.json; compare with baseline.json for new errors.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { start, go } from './e2e-lib.mjs';

const label = process.argv[2] || 'run';
const root = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const run = (cmd) => {
  try {
    return { ok: true, out: execSync(cmd, { cwd: root, encoding: 'utf8', stdio: 'pipe', maxBuffer: 64 * 1024 * 1024 }) };
  } catch (e) {
    return { ok: false, out: `${e.stdout || ''}\n${e.stderr || ''}` };
  }
};

const result = { label, at: new Date().toISOString() };

const build = run('npx ng build --configuration development');
result.build = { ok: build.ok, errors: (build.out.match(/(✘ \[ERROR\]|error TS\d+).*$/gm) || []).slice(0, 20) };

const lint = run('npx ng lint');
const lintSummary = lint.out.match(/✖ (\d+) problems? \((\d+) errors?, (\d+) warnings?\)/);
result.lint = { ok: lint.ok, errors: lintSummary ? Number(lintSummary[2]) : (lint.ok ? 0 : -1), warnings: lintSummary ? Number(lintSummary[3]) : 0 };

const test = run('npx ng test --watch=false');
const testLine = test.out.replace(/\x1b\[[0-9;]*m/g, '').match(/Tests\s+(\d+) passed(?: \| (\d+) failed)?|Tests\s+(\d+) failed[^\n]*/);
result.tests = { ok: test.ok, summary: testLine ? testLine[0].trim() : 'no summary' };

const pages = [
  '/dashboard', '/package/student', '/package/instructor', '/workspace/show-student',
  '/classroom/show-classroom', '/classroom/reservation', '/shift/active', '/shift/history', '/shift/add-shift',
  '/details/show-students', '/details/show-colleges', '/details/show-blacklist', '/details/show-instructors',
  '/catering/show-products', '/catering/product-graph', '/settings/general', '/settings/discounts',
  '/settings/show-user', '/settings/profile'
];
const { ctx, page } = await start();
const errors = {};
let current = '';
page.on('console', (m) => { if (m.type() === 'error') (errors[current] ||= []).push(m.text().slice(0, 240)); });
page.on('pageerror', (e) => (errors[current] ||= []).push('PAGEERROR ' + String(e.message).slice(0, 240)));
for (const p of pages) {
  current = p;
  try { await go(page, p); await page.waitForTimeout(2500); } catch (e) { (errors[p] ||= []).push('NAV ' + e.message.split('\n')[0]); }
}
await ctx.close();
result.console = errors;

fs.mkdirSync(`${root}/audit/logs/cleanup`, { recursive: true });
fs.writeFileSync(`${root}/audit/logs/cleanup/${label}.json`, JSON.stringify(result, null, 2));

const base = fs.existsSync(`${root}/audit/logs/cleanup/baseline.json`) ? JSON.parse(fs.readFileSync(`${root}/audit/logs/cleanup/baseline.json`, 'utf8')) : null;
const norm = (s) => s.replace(/\d+/g, '#');
const newErrors = {};
for (const [p, list] of Object.entries(errors)) {
  const known = new Set((base?.console?.[p] || []).map(norm));
  const fresh = list.filter((e) => !known.has(norm(e)));
  if (fresh.length && label !== 'baseline') newErrors[p] = fresh;
}
console.log(JSON.stringify({ build: result.build, lint: result.lint, tests: result.tests, pagesWithErrors: Object.keys(errors).length, newConsoleErrors: newErrors }, null, 2));
