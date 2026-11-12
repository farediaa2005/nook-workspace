// Nook frontend audit crawler.
// - Opens a HEADED Chromium with a persistent profile (audit/.pw-profile, git-ignored).
// - If not logged in, waits (up to 15 min) for a human to sign in on /auth/login.
// - Visits every route, records console + page errors + failed resources per route,
//   records a HAR (audit/logs/network.har), takes screenshots at 4 widths,
//   flags horizontal overflow, and clicks non-destructive buttons to open menus/modals.
// Usage: node crawl.mjs [baseUrl] [--no-click] [--only=route1,route2]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const auditDir = path.resolve(here, '..');
const BASE = (process.argv.find((a) => a.startsWith('http')) || 'http://localhost:4300').replace(/\/$/, '');
const NO_CLICK = process.argv.includes('--no-click');
const NO_SHOTS = process.argv.includes('--no-shots');
const HAR = (process.argv.find((a) => a.startsWith('--har=')) || '--har=network.har').slice(6);
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').replace('--only=', '').split(',').filter(Boolean);

const ROUTES = [
  '/auth/login',
  '/dashboard',
  '/workspace/show-student', '/workspace/add-student', '/workspace/checkout',
  '/classroom/show-classroom', '/classroom/add-classroom', '/classroom/checkout',
  '/classroom/reservation', '/classroom/show-reservation',
  '/shift/active', '/shift/history', '/shift/add-shift', '/shift/show-shift',
  '/shift/search-shift', '/shift/end-of-shift-balance',
  '/package/student', '/package/instructor', '/package/add-student-package', '/package/add-instructor-package',
  '/details/show-students', '/details/show-colleges', '/details/show-blacklist', '/details/show-instructors',
  '/catering/show-products', '/catering/add-products', '/catering/product-graph',
  '/settings/general', '/settings/discounts', '/settings/show-user', '/settings/profile',
  '/this-route-does-not-exist',
];
const WIDTHS = [360, 768, 1024, 1440];

// Never click anything that may destroy, close, pay, save or log out.
const DENY = /(delete|remove|حذف|إزالة|ازالة|مسح|clear|reset|logout|log out|sign out|خروج|end shift|close shift|إنهاء|انهاء|اغلاق|إغلاق الشيفت|checkout|check out|تسجيل الخروج|pay|دفع|save|حفظ|confirm|تأكيد|submit|إرسال|ارسال|send|whatsapp|block|حظر|unblock|cancel reservation|إلغاء الحجز|deactivate|toggle|approve|reject|redeem|start shift|open shift|بدء|فتح شيفت|export|تصدير|download|تحميل|print|طباعة|check in|check-in|تسجيل دخول|extend|تمديد|قفل|اقفل|تشيك أوت|تشيك اوت|شيل|امسح|احذف|ارفض|اقبل|ابعت|سجل خروج|إنهاء الجلسة|انهي)/i;

const logsDir = path.join(auditDir, 'logs');
const shotsDir = path.join(auditDir, 'screenshots', 'crawl');
fs.mkdirSync(shotsDir, { recursive: true });

const ctx = await chromium.launchPersistentContext(path.join(auditDir, '.pw-profile'), {
  headless: false,
  channel: 'chrome', // bundled Chromium fails to spawn on this machine (spawn UNKNOWN)
  viewport: { width: 1440, height: 900 },
  recordHar: { path: path.join(logsDir, HAR), content: 'embed', urlFilter: /\/(api|uploads|Uploads)\// },
});
const page = ctx.pages()[0] || (await ctx.newPage());

let current = 'boot';
const perRoute = {};
const bucket = () => (perRoute[current] ||= { console: [], pageErrors: [], failed: [], requests: [], overflow: {}, clicks: [] });
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) bucket().console.push(`[${m.type()}] ${m.text()}`.slice(0, 600));
});
page.on('pageerror', (e) => bucket().pageErrors.push(String(e?.stack || e).slice(0, 800)));
page.on('requestfailed', (r) => bucket().failed.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`));
const started = new Map();
page.on('request', (r) => started.set(r, Date.now()));
page.on('response', async (res) => {
  const req = res.request();
  const url = res.url();
  if (!/\/api\//i.test(url) && res.status() < 400) return;
  const t = Date.now() - (started.get(req) || Date.now());
  let body = '';
  try { if (/\/api\//i.test(url)) body = (await res.text()).slice(0, 400); } catch {}
  bucket().requests.push({ method: req.method(), url: url.replace(BASE, ''), status: res.status(), ms: t, payload: (req.postData() || '').slice(0, 300), body });
});

async function settle() {
  try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch {}
  await page.waitForTimeout(600);
}

// ---- login gate
current = '/auth/login (gate)';
await page.goto(BASE + '/dashboard');
await settle();
if (page.url().includes('/auth/login')) {
  console.log('>>> Please sign in in the opened Chromium window. Waiting up to 15 minutes...');
  await page.waitForURL((u) => !u.pathname.includes('/auth/login'), { timeout: 15 * 60 * 1000 });
  await settle();
}
console.log('>>> Logged in, starting crawl at', page.url());

for (const route of ROUTES) {
  if (ONLY.length && !ONLY.includes(route)) continue;
  current = route;
  const t0 = Date.now();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + route);
  await settle();
  bucket().finalUrl = page.url().replace(BASE, '');
  bucket().loadMs = Date.now() - t0;
  const safe = route.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') || 'root';

  for (const w of (NO_SHOTS ? [] : WIDTHS)) {
    await page.setViewportSize({ width: w, height: w < 800 ? 800 : 900 });
    await page.waitForTimeout(400);
    const ov = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const sw = document.documentElement.scrollWidth;
      const offenders = [];
      if (sw > docW + 1) {
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width && r.right > docW + 2 && getComputedStyle(el).position !== 'fixed') {
            offenders.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].slice(0, 2).join('.')} right=${Math.round(r.right)}`);
            if (offenders.length >= 5) break;
          }
        }
      }
      return { docW, scrollW: sw, offenders };
    });
    bucket().overflow[w] = ov;
    await page.screenshot({ path: path.join(shotsDir, `${safe}@${w}.png`), fullPage: false });
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  if (!NO_CLICK && route !== '/this-route-does-not-exist') {
    // click every visible non-destructive button in <main>, one by one
    const labels = await page.$$eval('main button, .main-content button, [role="tab"]', (els) =>
      els.filter((e) => e.offsetParent !== null && !e.disabled).map((e) => (e.innerText || e.getAttribute('aria-label') || e.title || '').trim().slice(0, 60)));
    const seen = new Set();
    let n = 0;
    for (const label of labels) {
      if (!label || seen.has(label) || DENY.test(label) || n >= 25) continue;
      seen.add(label);
      n++;
      const before = page.url();
      try {
        const btn = page.locator('main button, .main-content button, [role="tab"]', { hasText: label }).first();
        await btn.click({ timeout: 2500 });
        await page.waitForTimeout(700);
        const modalOpen = await page.locator('.modal, [role="dialog"], .modal-overlay, .modal-backdrop').first().isVisible().catch(() => false);
        bucket().clicks.push(`${label}${modalOpen ? ' → modal opened' : ''}${page.url() !== before ? ' → navigated ' + page.url().replace(BASE, '') : ''}`);
        if (modalOpen) await page.screenshot({ path: path.join(shotsDir, `${safe}__modal_${n}.png`) });
        if (modalOpen) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
          const still = await page.locator('.modal, [role="dialog"], .modal-overlay, .modal-backdrop').first().isVisible().catch(() => false);
          if (still) bucket().clicks.push('   ↳ Escape did NOT close the modal');
        }
        if (modalOpen || page.url() !== before) { await page.goto(before); await settle(); }
      } catch (e) {
        bucket().clicks.push(`${label} → click failed: ${String(e.message).split('\n')[0]}`);
      }
    }
  }
  console.log(`done ${route} (${bucket().console.length} console, ${bucket().requests.length} reqs)`);
  fs.writeFileSync(path.join(logsDir, process.argv.includes('--no-shots') ? 'crawl-clicks.json' : 'crawl-results.json'), JSON.stringify(perRoute, null, 2));
}

await ctx.close(); // flushes HAR
fs.writeFileSync(path.join(logsDir, process.argv.includes('--no-shots') ? 'crawl-clicks.json' : 'crawl-results.json'), JSON.stringify(perRoute, null, 2));
console.log('>>> crawl finished');
