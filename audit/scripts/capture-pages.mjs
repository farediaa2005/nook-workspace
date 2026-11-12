// Screenshots every page for one role at the given widths, with a HAR file and a readable summary of
// console errors/warnings and failed requests. Read-only: it only navigates (no clicks, no form submits).
// Usage: node capture-pages.mjs <role: admin|staff|guest> <phase: before|after> [widths=1440,360]
import fs from 'node:fs';
import path from 'node:path';
import { start, go, PAGES } from './e2e-lib.mjs';

const [role = 'admin', phase = 'before', widthsArg = '1440,360'] = process.argv.slice(2);
const widths = widthsArg.split(',').map(Number);
const auditDir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const shotDir = path.join(auditDir, 'screenshots', phase, process.env.THEME ? `${role}-${process.env.THEME}` : role);
const logDir = path.join(auditDir, 'logs', 'pages', phase);
fs.mkdirSync(shotDir, { recursive: true });
fs.mkdirSync(logDir, { recursive: true });


const summary = { role, phase, at: new Date().toISOString(), pages: {} };
for (const width of widths) {
  const har = path.join(logDir, `${role}-${width}.har`);
  const { ctx, page } = await start({ role, width, height: width < 600 ? 780 : 900, har });
  if (process.env.THEME) await ctx.addInitScript((t) => { try { localStorage.setItem('nook_theme', t); } catch {} }, process.env.THEME);
  let current = '';
  const bucket = () => (summary.pages[current] ||= {})[width] ||= { landedOn: '', errors: [], warnings: [], failed: [], requests: 0 };
  page.on('console', (m) => {
    if (!current) return;
    if (m.type() === 'error') bucket().errors.push(m.text().slice(0, 260));
    if (m.type() === 'warning') bucket().warnings.push(m.text().slice(0, 260));
  });
  page.on('pageerror', (e) => current && bucket().errors.push('PAGEERROR ' + String(e.message).slice(0, 260)));
  page.on('requestfinished', () => current && bucket().requests++);
  page.on('response', (r) => { if (current && r.status() >= 400) bucket().failed.push(`${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')} ${r.status()}`); });
  page.on('requestfailed', (r) => current && bucket().failed.push(`${r.method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')} FAILED ${r.failure()?.errorText || ''}`));

  for (const route of PAGES.filter((p) => !process.env.ONLY || process.env.ONLY.split(',').includes(p))) {
    current = route;
    bucket();
    try {
      await go(page, route);
      await page.waitForTimeout(1500);
      bucket().landedOn = new URL(page.url()).pathname;
      const file = `${route.replace(/^\//, '').replace(/\W+/g, '_') || 'root'}@${width}.png`;
      await page.screenshot({ path: path.join(shotDir, file), fullPage: true });
    } catch (e) {
      bucket().errors.push('NAV ' + e.message.split('\n')[0]);
    }
  }
  current = '';
  await ctx.close();
}

fs.writeFileSync(path.join(logDir, `${role}.json`), JSON.stringify(summary, null, 2));
const lines = [`# Page capture — ${role} — ${phase} (${summary.at})`, '', '| Page | Width | Landed on | Requests | Failed | Console errors | Warnings |', '|---|---|---|---|---|---|---|'];
for (const [route, byWidth] of Object.entries(summary.pages)) {
  for (const [w, b] of Object.entries(byWidth)) {
    lines.push(`| ${route} | ${w} | ${b.landedOn} | ${b.requests} | ${b.failed.length} | ${b.errors.length} | ${b.warnings.length} |`);
  }
}
lines.push('', '## Details', '');
for (const [route, byWidth] of Object.entries(summary.pages)) {
  for (const [w, b] of Object.entries(byWidth)) {
    if (!b.errors.length && !b.failed.length && !b.warnings.length) continue;
    lines.push(`### ${route} @${w}`);
    for (const f of [...new Set(b.failed)]) lines.push(`- failed: ${f}`);
    for (const e of [...new Set(b.errors)]) lines.push(`- error: ${e}`);
    for (const e of [...new Set(b.warnings)]) lines.push(`- warning: ${e}`);
    lines.push('');
  }
}
fs.writeFileSync(path.join(logDir, `${role}.md`), lines.join('\n'));
console.log(lines.slice(0, 4 + Object.keys(summary.pages).length * widths.length).join('\n'));
