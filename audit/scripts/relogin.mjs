// Clears the stale session in the Playwright profile and waits (headed) for a human to sign in.
import { chromium } from 'playwright';
import path from 'node:path';

const ctx = await chromium.launchPersistentContext(path.resolve('../.pw-profile'), { headless: false, channel: 'chrome', viewport: { width: 1280, height: 860 } });
const page = ctx.pages()[0] || (await ctx.newPage());
await page.goto('http://localhost:4300/auth/login');
await page.evaluate(() => { Object.keys(localStorage).filter(k => k.startsWith('nook_')).forEach(k => localStorage.removeItem(k)); sessionStorage.clear(); });
await page.goto('http://localhost:4300/auth/login');
console.log('>>> Please sign in in the Chrome window (waiting up to 15 minutes)…');
await page.waitForURL(u => !u.pathname.includes('/auth/login'), { timeout: 15 * 60 * 1000 });
await page.waitForTimeout(2500);
const me = await page.evaluate(async () => {
  const t = localStorage.getItem('nook_access_token') || localStorage.getItem('nook_token') || '';
  const r = await fetch('/api/Auth/me', { headers: { Authorization: t.startsWith('Bearer') ? t : `Bearer ${t}` } });
  return { status: r.status, body: (await r.text()).slice(0, 300) };
});
console.log('>>> /api/Auth/me', me.status, me.body);
await ctx.close();
