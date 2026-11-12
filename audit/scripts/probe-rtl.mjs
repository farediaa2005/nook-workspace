// C4 RTL check: opens each page in Arabic (RTL) and English (LTR) at 1440 and 360 and reports
//  - the document direction (must be rtl for Arabic, ltr for English)
//  - text blocks aligned to the wrong side: Arabic text with text-align:left on an RTL page, or English text
//    with text-align:right on an LTR page (only blocks clearly wider than their text, so the side shows)
//  - sideways page scroll (document wider than the screen)
// Read-only: no clicks except what the page does on load.
// Usage: node probe-rtl.mjs <label> [route,route…]
import fs from 'node:fs';
import path from 'node:path';
import { start, go } from './e2e-lib.mjs';

const ROUTES = ['/dashboard', '/workspace/show-student', '/details/show-students', '/classroom/show-classroom',
  '/classroom/reservation', '/details/show-colleges', '/details/add-discount', '/shift/active-shift',
  '/shift/shift-history', '/shift/add-shift', '/settings/general', '/settings/profile', '/settings/show-user',
  '/package/show-student-package', '/package/show-instructor-package', '/catering/show-products',
  '/details/show-instructors', '/details/show-blacklist', '/catering/product-graph'];
const [label = 'rtl', list] = process.argv.slice(2);
const routes = list ? list.split(',') : ROUTES;
const out = [];
let problems = 0;
for (const lang of ['ar', 'en']) {
  process.env.LANG_UI = lang;
  for (const width of (process.env.WIDTHS || "1440,360").split(",").map(Number)) {
    const { ctx, page } = await start({ role: 'admin', width, height: 900 });
    for (const route of routes) {
      try {
        await go(page, route);
        await page.waitForTimeout(600);
        const r = await page.evaluate((lang) => {
          const AR = /[؀-ۿ]/, EN = /[A-Za-z]{3}/;
          const dir = document.documentElement.getAttribute('dir') || getComputedStyle(document.documentElement).direction;
          const wrong = [];
          for (const el of document.querySelectorAll('body *')) {
            if (!el.childNodes.length || el.children.length > 2) continue;
            const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').trim();
            if (text.length < 4) continue;
            const cs = getComputedStyle(el);
            if (cs.display === 'inline' || cs.display === 'none' || cs.visibility === 'hidden') continue;
            const box = el.getBoundingClientRect();
            if (box.width < 120 || box.height === 0) continue;
            const range = document.createRange(); range.selectNodeContents(el);
            const tw = range.getBoundingClientRect().width;
            if (box.width - tw < 60) continue; // text fills the block: alignment does not show
            const ta = cs.textAlign;
            if (lang === 'ar' && AR.test(text) && ta === 'left') wrong.push(`left-aligned Arabic: "${text.slice(0, 50)}" <${el.tagName.toLowerCase()}.${[...el.classList].join('.')}>`);
            if (lang === 'en' && EN.test(text) && !AR.test(text) && ta === 'right') wrong.push(`right-aligned English: "${text.slice(0, 50)}" <${el.tagName.toLowerCase()}.${[...el.classList].join('.')}>`);
          }
          const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          return { dir, wrong: [...new Set(wrong)].slice(0, 12), overflow };
        }, lang);
        const bad = (lang === 'ar' ? r.dir !== 'rtl' : r.dir !== 'ltr') || r.wrong.length || r.overflow > 2;
        if (bad) problems++;
        out.push({ lang, width, route, ...r });
        console.log(`${bad ? '⚠' : '✓'} ${lang} ${width} ${route}: dir ${r.dir}, wrong side ${r.wrong.length}, sideways scroll ${r.overflow}px`);
        for (const w of r.wrong) console.log('     ' + w);
      } catch (e) { problems++; console.log(`⚠ ${lang} ${width} ${route}: ${e.message.split('\n')[0].slice(0, 100)}`); }
    }
    await ctx.close();
  }
}
const dir = path.resolve('../logs/rtl'); fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `${label}.json`), JSON.stringify(out, null, 1));
console.log(problems ? `${problems} page(s) to look at` : 'all clean');
