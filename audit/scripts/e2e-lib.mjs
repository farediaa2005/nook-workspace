// Shared helpers for the end-to-end run against the live backend.
// Every write request (POST/PUT/PATCH/DELETE) and every console error is recorded per step
// in audit/logs/e2e/<step>.json, with a screenshot in audit/screenshots/e2e/.
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

export const BASE = 'http://localhost:4300';

/** Every page of the web app (routes with a component), plus the login page and an unknown URL. */
export const PAGES = [
  '/auth/login', '/dashboard', '/workspace/show-student', '/classroom/show-classroom', '/classroom/reservation',
  '/package/student', '/package/instructor', '/shift/active', '/shift/history', '/shift/add-shift',
  '/details/show-students', '/details/show-instructors', '/details/show-colleges', '/details/show-blacklist',
  '/catering/show-products', '/catering/product-graph', '/settings/general', '/settings/discounts',
  '/settings/show-user', '/settings/profile', '/this-page-does-not-exist'
];
const auditDir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const logDir = path.join(auditDir, 'logs', 'e2e');
const shotDir = path.join(auditDir, 'screenshots', 'e2e');
fs.mkdirSync(logDir, { recursive: true });
fs.mkdirSync(shotDir, { recursive: true });

/** Browser profile per role: admin → .pw-profile, staff → .pw-profile-staff, guest → fresh context (logged out). */
export const PROFILES = { admin: '.pw-profile', staff: '.pw-profile-staff' };

export async function start({ headless = true, width = 1440, height = 900, role = 'admin', har } = {}) {
  const options = {
    headless, channel: 'chrome', viewport: { width, height }, acceptDownloads: true,
    ...(har ? { recordHar: { path: har, content: 'omit' } } : {})
  };
  let ctx;
  if (role === 'guest') {
    const browser = await chromium.launch({ headless, channel: 'chrome' });
    ctx = await browser.newContext(options);
    const close = ctx.close.bind(ctx);
    ctx.close = async () => { await close(); await browser.close(); };
  } else {
    ctx = await chromium.launchPersistentContext(path.join(auditDir, PROFILES[role] || PROFILES.admin), options);
  }
  // Same theme on every run (dark unless THEME=light), so screenshots stay comparable
  await ctx.addInitScript((t) => { try { localStorage.setItem('nook_theme', t); } catch {} }, process.env.THEME || 'dark');
  // Same language on every run (Arabic unless LANG_UI=en)
  await ctx.addInitScript((l) => { try { localStorage.setItem('nook_lang', l); } catch {} }, process.env.LANG_UI || 'ar');
  const page = ctx.pages()[0] || (await ctx.newPage());
  const rec = { writes: [], errors: [], apiErrors: [] };
  page.on('console', (m) => { if (m.type() === 'error') rec.errors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => rec.errors.push('[pageerror] ' + String(e).slice(0, 300)));
  page.on('response', async (r) => {
    const req = r.request();
    const url = r.url().replace(/^https?:\/\/[^/]+/, '');
    if (!url.startsWith('/api/')) return;
    let body = '';
    if (req.method() !== 'GET' || r.status() >= 400) { try { body = (await r.text()).slice(0, 800); } catch {} }
    if (req.method() !== 'GET') rec.writes.push({ m: req.method(), url, status: r.status(), req: (req.postData() || '').slice(0, 800), res: body });
    if (r.status() >= 400) rec.apiErrors.push({ m: req.method(), url, status: r.status(), res: body });
  });
  return { ctx, page, rec };
}

export async function go(page, route) {
  await page.goto(BASE + route);
  try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch {}
  await page.waitForTimeout(800);
  await dismissToasts(page);
}

export async function dismissToasts(page) {
  await page.locator('app-toast-container button').evaluateAll((bs) => bs.forEach((b) => b.click())).catch(() => {});
}

export async function toasts(page) {
  return page.$$eval('app-toast-container .toast-message', (els) => els.map((e) => e.textContent.trim())).catch(() => []);
}

/** Fill an input/textarea located by placeholder, label text, or CSS selector. */
export async function fill(page, target, value) {
  let loc;
  if (/^[#.\[]|^(input|textarea|select)/.test(target)) loc = page.locator(target).filter({ visible: true }).first();
  else {
    loc = page.getByPlaceholder(target, { exact: false }).filter({ visible: true }).first();
    if (!(await loc.count())) loc = page.getByLabel(target, { exact: false }).filter({ visible: true }).first();
  }
  await loc.fill(String(value), { timeout: 5000 });
}

export async function click(page, name, { exact = false, nth = 0, timeout = 5000 } = {}) {
  const loc = page.getByRole('button', { name, exact }).filter({ visible: true }).nth(nth);
  await loc.click({ timeout });
  await page.waitForTimeout(500);
}

export async function shot(page, name) {
  const file = path.join(shotDir, name.replace(/[^\w-]+/g, '_') + '.png');
  await page.screenshot({ path: file, fullPage: false });
  return path.relative(auditDir, file).replace(/\\/g, '/');
}

/** Record the outcome of a step and reset the request/console buffers. */
export function record(rec, step, data) {
  const entry = { step, at: new Date().toISOString(), ...data, writes: rec.writes.splice(0), consoleErrors: rec.errors.splice(0), apiErrors: rec.apiErrors.splice(0) };
  fs.writeFileSync(path.join(logDir, step.replace(/[^\w-]+/g, '_') + '.json'), JSON.stringify(entry, null, 2));
  const flag = entry.ok === false || entry.apiErrors.length || entry.consoleErrors.length ? '⚠' : '✓';
  console.log(`${flag} ${step}: ${entry.note || ''} | writes ${entry.writes.map((w) => `${w.m} ${w.url.split('?')[0]} ${w.status}`).join(', ') || '-'}${entry.apiErrors.length ? ' | API ERRORS ' + entry.apiErrors.map((a) => `${a.status} ${a.url}`).join(', ') : ''}${entry.consoleErrors.length ? ' | console ' + entry.consoleErrors.length : ''}`);
  return entry;
}

/** Read-only API call with the signed-in user's token (for verifying what the backend stored). */
export async function api(page, url) {
  if (!page.url().startsWith(BASE)) await go(page, '/dashboard');
  return page.evaluate(async (u) => {
    const t = localStorage.getItem('nook_access_token') || localStorage.getItem('nook_token') || '';
    const r = await fetch(u, { headers: { Authorization: t.startsWith('Bearer') ? t : `Bearer ${t}` } });
    let body = null; try { body = await r.json(); } catch {}
    return { status: r.status, data: body?.data ?? body };
  }, url);
}

/** Dumps visible form fields and buttons of the topmost modal (or the page) to help scripting. */
export async function probe(page) {
  return page.evaluate(() => {
    const scopes = [...document.querySelectorAll('.modal-overlay, .modal-backdrop, .modal-backdrop-custom, [role="dialog"], .drawer, .add-item-overlay')].filter((e) => e.getClientRects().length);
    const root = scopes[scopes.length - 1] || document.querySelector('main') || document.body;
    const fields = [...root.querySelectorAll('input, select, textarea')].filter((e) => e.getClientRects().length).map((e) => ({ tag: e.tagName.toLowerCase(), type: e.type, name: e.name || e.id || '', ph: e.placeholder || '', val: (e.value || '').slice(0, 30), opts: e.tagName === 'SELECT' ? [...e.options].map((o) => o.text).slice(0, 8) : undefined }));
    const buttons = [...root.querySelectorAll('button')].filter((e) => e.getClientRects().length).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40)).filter(Boolean);
    const labels = [...root.querySelectorAll('label')].filter((e) => e.getClientRects().length).map((l) => l.innerText.trim().replace(/\s+/g, ' ').slice(0, 40));
    return { fields, buttons: [...new Set(buttons)], labels: [...new Set(labels)] };
  });
}
