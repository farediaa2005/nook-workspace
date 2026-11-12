// Opens pages (and optionally a dialog) in Arabic and English and checks the visible text for leftovers of
// the language-file move: raw key names (<prefix>Something), "undefined", "[object" and console errors.
// Usage: node probe-lang.mjs <label> <case,case…>   (cases below)
import { readLang, isLangFile } from './lang-src.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { start, go } from './e2e-lib.mjs';

const CASES = {
  workspace: { route: '/workspace/show-student' },
  checkin: { route: '/workspace/show-student?openCheckIn=true' },
  students: { route: '/details/show-students' },
  register: { route: '/details/show-students', open: 'css=main app-page-header ~ * app-primary-button, main .btn-register-action, main app-primary-button' },
  classroom: { route: '/classroom/show-classroom' },
  booking: { route: '/classroom/show-classroom', open: 'css=main app-primary-button' },
  reservations: { route: '/classroom/reservation' },
  resModal: { route: '/classroom/reservation', open: 'css=main app-primary-button' },
  colleges: { route: '/details/show-colleges' },
  discounts: { route: '/settings/discounts' },
  discountAdd: { route: '/settings/discounts', open: 'css=main app-primary-button' },
  shift: { route: '/shift/active' },
  shiftHistory: { route: '/shift/history' },
  addShift: { route: '/shift/add-shift' },
  settings: { route: '/settings/general' },
  profile: { route: '/settings/profile' },
  users: { route: '/settings/show-user' },
  pkgStudent: { route: '/package/student' },
  pkgInstructor: { route: '/package/instructor' },
  products: { route: '/catering/show-products' },
  graph: { route: '/catering/product-graph' },
  instructors: { route: '/details/show-instructors' },
  blacklist: { route: '/details/show-blacklist' },
  dashboard: { route: '/dashboard' },
  checkout: { route: '/workspace/show-student', open: 'css=tbody tr .btn-checkout, tbody tr button.btn-row-checkout, tbody tr .actions-wrapper button:last-child' },
  analytics: { route: '/details/show-students', open: 'css=.btn-analytics-icon' }
};
const [label = 'lang', list = Object.keys(CASES).join(',')] = process.argv.slice(2);
const shotDir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'screenshots', label, 'lang');
fs.mkdirSync(shotDir, { recursive: true });
// A raw key on screen looks like "wsSomethingLong": a known key prefix followed by CamelCase. The prefixes come
// from the language file itself (the leading lower-case part of keys that have an upper-case letter, used by 5+ keys).
const langSrc = readLang();
const keyNames = [...langSrc.matchAll(/^ {2}([a-z][A-Za-z0-9]*)\??: string;/gm)].map((m) => m[1]);
const prefixCount = {};
for (const k of keyNames) { const p = (k.match(/^[a-z0-9]+(?=[A-Z])/) || [])[0]; if (p) prefixCount[p] = (prefixCount[p] || 0) + 1; }
const keyPrefixes = Object.keys(prefixCount).filter((p) => prefixCount[p] >= 5);
const rawKey = new RegExp(`\\b(${keyPrefixes.join('|')})[A-Z][A-Za-z0-9]+\\b`, 'g');

let problems = 0;
const arabicInEn = {};
for (const lang of ['ar', 'en']) {
  process.env.LANG_UI = lang;
  const { ctx, page } = await start({ role: 'admin', width: 1440 });
  let errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
  for (const name of list.split(',')) {
    const c = CASES[name];
    errors = [];
    try {
      await go(page, c.route);
      if (c.open) {
        const sel = c.open.slice(c.open.indexOf('=') + 1);
        await page.locator(sel).filter({ visible: true }).first().click({ timeout: 6000 });
        await page.waitForTimeout(900);
      }
      const text = await page.locator('body').innerText();
      const raw = [...new Set(text.match(rawKey) || [])];
      const undef = (text.match(/\bundefined\b|\[object /g) || []).length;
      // English pages: list every line / tooltip / placeholder that still shows Arabic letters
      // (names typed by users show up too; the list is reviewed by hand)
      if (lang === 'en') {
        const attrs = await page.evaluate(() => [...document.querySelectorAll('[title],[placeholder],[aria-label]')]
          .map((el) => [el.getAttribute('title'), el.getAttribute('placeholder'), el.getAttribute('aria-label')].filter(Boolean).join(' | ')));
        const arabic = [...new Set([...text.split('\n'), ...attrs].map((s) => s.trim()).filter((s) => /[؀-ۿ]/.test(s)))];
        arabicInEn[name] = arabic;
      }
      await page.screenshot({ path: path.join(shotDir, `${name}-${lang}.png`) });
      const bad = raw.length || undef || errors.length;
      if (bad) problems++;
      console.log(`${bad ? '⚠' : '✓'} ${lang} ${name}: rawKeys ${JSON.stringify(raw.slice(0, 6))} undefined ${undef} consoleErrors ${errors.length}${errors.length ? ' ' + errors[0] : ''}`);
    } catch (e) { problems++; console.log(`⚠ ${lang} ${name}: ${e.message.split('\n')[0].slice(0, 120)}`); }
  }
  await ctx.close();
}
fs.writeFileSync(path.join(shotDir, 'arabic-in-en.json'), JSON.stringify(arabicInEn, null, 1));
console.log(`Arabic text on English pages: ${Object.values(arabicInEn).reduce((n, a) => n + a.length, 0)} line(s) → ${path.join(shotDir, 'arabic-in-en.json')}`);
console.log(problems ? `${problems} problem(s)` : 'all clean');
