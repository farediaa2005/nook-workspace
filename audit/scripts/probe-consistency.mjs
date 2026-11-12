// C5: measures how shared elements look across pages (English + dark, 1440): text inputs, selects, table headers,
// form labels, dialog titles and plain buttons. For each kind, lists the distinct computed style variants with
// how many elements and which pages use them, so outliers stand out. Read-only (opens a few dialogs, then Escape).
// Usage: node probe-consistency.mjs <label>   → ../logs/c5/consistency-<label>.json
import fs from 'node:fs';
import path from 'node:path';
import { start, go } from './e2e-lib.mjs';

const PAGES = [
  ['/dashboard'], ['/workspace/show-student'], ['/workspace/show-student?openCheckIn=true', ''],
  ['/details/show-students'], ['/details/show-students', 'css=main app-page-header ~ * app-primary-button, main .btn-register-action, main app-primary-button'],
  ['/classroom/show-classroom'], ['/classroom/show-classroom', 'css=main app-primary-button'],
  ['/settings/discounts', 'css=main app-primary-button'],
  ['/classroom/reservation'], ['/details/show-colleges'], ['/details/add-discount'], ['/shift/active-shift'],
  ['/shift/shift-history'], ['/shift/add-shift'], ['/settings/general'], ['/settings/profile'], ['/settings/show-user'],
  ['/catering/show-products'], ['/details/show-instructors'], ['/details/show-blacklist'], ['/catering/product-graph'],
];
const KINDS = {
  input: { sel: 'input[type="text"], input[type="number"], input[type="email"], input[type="tel"], input[type="search"], input:not([type]), input[type="password"]', props: ['height', 'fontSize', 'borderTopLeftRadius', 'borderTopWidth', 'paddingInlineStart'] },
  select: { sel: 'select, app-custom-select .select-trigger, app-custom-select button', props: ['height', 'fontSize', 'borderTopLeftRadius'] },
  textarea: { sel: 'textarea', props: ['fontSize', 'borderTopLeftRadius', 'borderTopWidth'] },
  th: { sel: 'th', props: ['fontSize', 'fontWeight', 'textTransform', 'letterSpacing', 'color'] },
  label: { sel: 'label', props: ['fontSize', 'fontWeight', 'textTransform', 'letterSpacing', 'color'] },
  dialogTitle: { sel: '[role="dialog"] h2, [role="dialog"] h3, .modal h2, .modal-title, .modal-header h2, .modal-header h3', props: ['fontSize', 'fontWeight'] },
  button: { sel: 'button:not(app-primary-button button):not([role="tab"])', props: ['height', 'fontSize', 'fontWeight', 'borderTopLeftRadius'] },
};
const label = process.argv[2] || 'run';
process.env.LANG_UI = 'en';
const { ctx, page } = await start({ role: 'admin', width: 1440, height: 900 });
const out = {};
for (const [route, open] of PAGES) {
  const where = route + (open !== undefined ? ' (dialog)' : '');
  try {
    await go(page, route);
    if (open) await page.locator(open.slice(4)).filter({ visible: true }).first().click({ timeout: 6000 });
    if (open !== undefined) await page.waitForTimeout(1200);
    const res = await page.evaluate((KINDS) => {
      const r = {};
      for (const [kind, { sel, props }] of Object.entries(KINDS)) {
        for (const el of document.querySelectorAll(sel)) {
          const b = el.getBoundingClientRect();
          if (!b.width || !b.height) continue;
          const cs = getComputedStyle(el);
          const v = props.map((p) => `${p}:${p === 'height' ? Math.round(b.height) + 'px' : cs[p]}`).join(' ');
          const cls = (el.getAttribute('class') || '').split(/\s+/).filter((c) => c && !c.startsWith('ng-')).slice(0, 2).join('.');
          (r[kind] ||= []).push([v, `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`]);
        }
      }
      return r;
    }, KINDS);
    for (const [kind, list] of Object.entries(res)) for (const [v, el] of list) {
      const k = (out[kind] ||= {});
      const e = (k[v] ||= { count: 0, pages: new Set(), examples: new Set() });
      e.count++; e.pages.add(where); if (e.examples.size < 4) e.examples.add(el);
    }
    if (open) await page.keyboard.press('Escape');
  } catch (e) { console.log(`⚠ ${where}: ${e.message.split('\n')[0].slice(0, 90)}`); }
}
await ctx.close();
const json = {};
for (const [kind, variants] of Object.entries(out)) {
  const list = Object.entries(variants).map(([v, e]) => ({ style: v, count: e.count, pages: [...e.pages], examples: [...e.examples] })).sort((a, b) => b.count - a.count);
  json[kind] = list;
  console.log(`\n== ${kind}: ${list.length} variant(s)`);
  for (const x of list.slice(0, 8)) console.log(`  ${String(x.count).padStart(4)}  ${x.style}  [${x.pages.length} page(s); e.g. ${x.examples.slice(0, 2).join(', ')}]`);
}
const dir = path.resolve('../logs/c5'); fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `consistency-${label}.json`), JSON.stringify(json, null, 1));
