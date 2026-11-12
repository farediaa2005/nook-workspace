// C6: for every table on a page, checks whether the row actions (the last cell of the first rows, or any button in
// the row) are visible without scrolling the table sideways. Reports per page, width and language.
// Read-only. Usage: node probe-row-actions.mjs <label> [widths=360,768,1024,1440]
import fs from 'node:fs';
import path from 'node:path';
import { start, go } from './e2e-lib.mjs';

const ROUTES = ['/workspace/show-student', '/details/show-students', '/classroom/reservation', '/details/show-colleges',
  '/details/add-discount', '/shift/active-shift', '/shift/shift-history', '/settings/show-user', '/catering/show-products',
  '/details/show-instructors', '/details/show-blacklist', '/package/show-student-package', '/package/show-instructor-package',
  '/settings/general', '/dashboard', '/catering/product-graph'];
const [label = 'run', widthsArg = '360,768,1024,1440'] = process.argv.slice(2);
const out = [];
for (const lang of ['ar', 'en']) {
  process.env.LANG_UI = lang;
  for (const width of widthsArg.split(',').map(Number)) {
    const { ctx, page } = await start({ role: 'admin', width, height: 900 });
    for (const route of ROUTES) {
      try {
        await go(page, route);
        await page.waitForTimeout(700);
        const tables = await page.evaluate(() => {
          const res = [];
          for (const t of document.querySelectorAll('table')) {
            const rows = [...t.querySelectorAll('tbody tr')].filter((r) => r.cells.length > 2).slice(0, 3);
            if (!rows.length) continue;
            // the visible area: the nearest scrolling ancestor, else the window
            let box = { left: 0, right: window.innerWidth };
            for (let p = t.parentElement; p; p = p.parentElement) {
              const cs = getComputedStyle(p);
              if (/(auto|scroll|hidden)/.test(cs.overflowX)) { const b = p.getBoundingClientRect(); box = { left: Math.max(0, b.left), right: Math.min(window.innerWidth, b.right) }; break; }
            }
            let hidden = 0, total = 0, lastHidden = 0;
            const out = (el) => { const b = el.getBoundingClientRect(); return b.width && (b.left < box.left - 1 || b.right > box.right + 1); };
            for (const r of rows) {
              const targets = [...r.querySelectorAll('button, a[href]')];
              const last = r.cells[r.cells.length - 1];
              for (const el of targets.length ? targets : [last]) {
                if (!el.getBoundingClientRect().width) continue;
                total++;
                if (out(el)) hidden++;
              }
              // the last column (where the row actions are) on its own
              if ([...last.querySelectorAll('button, a[href]')].some(out)) lastHidden++;
            }
            const cls = (t.getAttribute('class') || 'table').split(/\s+/)[0];
            res.push({ table: cls, sticky: t.classList.contains('sticky-actions'), hidden, total, lastHidden });
          }
          return res;
        });
        for (const t of tables) {
          out.push({ lang, width, route, ...t });
          if (t.hidden) console.log(`⚠ ${lang} ${width} ${route} ${t.table}: ${t.hidden}/${t.total} row controls off-screen`);
        }
      } catch (e) { console.log(`⚠ ${lang} ${width} ${route}: ${e.message.split('\n')[0].slice(0, 80)}`); }
    }
    await ctx.close();
  }
}
const dir = path.resolve('../logs/c6'); fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `row-actions-${label}.json`), JSON.stringify(out, null, 1));
const bad = out.filter((x) => x.hidden);
console.log(`${out.length} table checks, ${bad.length} with off-screen row controls`);
