// Opens a visible Chrome window on the login page for one role's browser profile and waits
// (up to 20 minutes) for a human to sign in. Usage: node signin-role.mjs staff
// The password is typed by the person in the window — this script never sees or stores it.
// For "staff" the profile starts empty, and an Admin login is rejected (signed out again) so the
// profile really holds a non-admin account.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { PROFILES, BASE } from './e2e-lib.mjs';

const role = process.argv[2] || 'staff';
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', PROFILES[role]);
if (role !== 'admin') fs.rmSync(dir, { recursive: true, force: true }); // test profile only

const ctx = await chromium.launchPersistentContext(dir, { headless: false, channel: 'chrome', viewport: { width: 1280, height: 860 } });
const page = ctx.pages()[0] || (await ctx.newPage());
const deadline = Date.now() + 20 * 60 * 1000;

const whoAmI = () => page.evaluate(async () => {
  const t = localStorage.getItem('nook_access_token') || '';
  const r = await fetch('/api/Auth/me', { headers: { Authorization: t.startsWith('Bearer') ? t : `Bearer ${t}` } });
  const j = await r.json().catch(() => ({}));
  const d = j.data || j;
  return { status: r.status, username: d.username || d.userName, roles: d.roles || [] };
});

await page.goto(`${BASE}/auth/login`);
for (;;) {
  console.log(`>>> [${role}] Please sign in in the Chrome window${role === 'staff' ? ' with the RECEPTIONIST account (not admin)' : ''}…`);
  await page.waitForURL((u) => !u.pathname.includes('/auth/login'), { timeout: Math.max(1000, deadline - Date.now()) });
  await page.waitForTimeout(2500);
  const me = await whoAmI();
  const isAdmin = (me.roles || []).some((r) => r === 1 || r === 'Admin');
  if (role === 'staff' && isAdmin) {
    console.log(`>>> [staff] "${me.username}" is an Admin account — signing out, please use the receptionist account.`);
    await page.evaluate(() => { Object.keys(localStorage).filter((k) => k.startsWith('nook_')).forEach((k) => localStorage.removeItem(k)); sessionStorage.clear(); });
    await page.goto(`${BASE}/auth/login`);
    await page.evaluate(() => { Object.keys(localStorage).filter((k) => k.startsWith('nook_')).forEach((k) => localStorage.removeItem(k)); });
    await page.reload();
    continue;
  }
  console.log(`>>> [${role}] signed in: /api/Auth/me ${me.status} user ${me.username} roles ${JSON.stringify(me.roles)}`);
  break;
}
await ctx.close();
