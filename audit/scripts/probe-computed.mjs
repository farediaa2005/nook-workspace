// C2: records, for every page, the distinct (element class → computed font-size / border-radius / color /
// background-color / border-color) pairs in both themes, so a token change can be compared before/after.
// Distinct pairs (not counts) keep the comparison stable when live data adds or removes rows.
// Usage: node probe-computed.mjs <label>            → ../logs/c2/computed-<label>.json
//        node probe-computed.mjs --diff <a> <b>     → pairs that differ between two runs
import fs from 'node:fs';
import path from 'node:path';
import { start, go } from './e2e-lib.mjs';

const dir = path.resolve('../logs/c2');
if (process.argv[2] === '--diff') {
  const [a, b] = process.argv.slice(3).map((l) => JSON.parse(fs.readFileSync(path.join(dir, `computed-${l}.json`), 'utf8')));
  let total = 0;
  for (const key of Object.keys(a)) {
    const A = new Set(a[key]), B = new Set(b[key] || []);
    const gone = [...A].filter((x) => !B.has(x)), added = [...B].filter((x) => !A.has(x));
    if (gone.length || added.length) {
      total += gone.length + added.length;
      console.log(`== ${key}: ${gone.length} gone, ${added.length} new`);
      for (const x of gone.slice(0, 8)) console.log('   - ' + x);
      for (const x of added.slice(0, 8)) console.log('   + ' + x);
    }
  }
  console.log(total ? `${total} differing pair(s)` : 'identical');
  process.exit(0);
}
const ROUTES = ['/dashboard', '/workspace/show-student', '/details/show-students', '/classroom/show-classroom',
  '/classroom/reservation', '/details/show-colleges', '/details/add-discount', '/shift/active-shift',
  '/shift/shift-history', '/shift/add-shift', '/settings/general', '/settings/profile', '/settings/show-user',
  '/package/show-student-package', '/package/show-instructor-package', '/catering/show-products',
  '/details/show-instructors', '/details/show-blacklist', '/catering/product-graph'];
const label = process.argv[2] || 'run';
const out = {};
for (const theme of ['dark', 'light']) {
  process.env.THEME = theme;
  const { ctx, page } = await start({ role: 'admin', width: 1440, height: 900 });
  for (const route of ROUTES) {
    try {
      await go(page, route);
      await page.waitForTimeout(700);
      out[`${theme} ${route}`] = await page.evaluate(() => {
        const pairs = new Set();
        for (const el of document.querySelectorAll('body *')) {
          const cls = el.getAttribute('class');
          if (!cls) continue;
          const cs = getComputedStyle(el);
          const id = `${el.tagName.toLowerCase()}.${cls.trim().split(/\s+/).filter((c) => !c.startsWith('ng-')).sort().join('.')}`;
          pairs.add(`${id} | fs ${cs.fontSize} | r ${cs.borderTopLeftRadius} | c ${cs.color} | bg ${cs.backgroundColor} | bc ${cs.borderTopColor}`);
        }
        return [...pairs];
      });
    } catch (e) { out[`${theme} ${route}`] = ['ERROR ' + e.message.slice(0, 80)]; }
  }
  await ctx.close();
}
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `computed-${label}.json`), JSON.stringify(out));
console.log(`${Object.keys(out).length} page/theme snapshots → computed-${label}.json`);
