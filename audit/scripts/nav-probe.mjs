// Lists the navigation a role gets (sidebar groups/links, navbar buttons) and which pages it can open.
// Usage: node nav-probe.mjs <role: admin|staff|guest>  → audit/logs/roles/<role>-nav.json
import fs from 'node:fs';
import path from 'node:path';
import { start, go, PAGES } from './e2e-lib.mjs';

const role = process.argv[2] || 'admin';
const out = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'logs', 'roles');
fs.mkdirSync(out, { recursive: true });
const { ctx, page } = await start({ role });
await go(page, '/dashboard');
// expand every collapsible sidebar group so all links are visible
const groups = page.locator('app-sidebar button, app-sidebar [role="button"]');
for (let i = 0; i < await groups.count(); i++) { await groups.nth(i).click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(150); }
const nav = await page.evaluate(() => ({
  sidebarLinks: [...document.querySelectorAll('app-sidebar a')].map((a) => ({ text: a.innerText.trim().replace(/\s+/g, ' '), href: a.getAttribute('href') })),
  sidebarButtons: [...document.querySelectorAll('app-sidebar button')].map((b) => b.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean),
  navbarButtons: [...document.querySelectorAll('app-navbar button, app-navbar a')].map((b) => (b.innerText || b.getAttribute('aria-label') || b.getAttribute('title') || '').trim().replace(/\s+/g, ' ')).filter(Boolean),
  user: (document.querySelector('app-navbar')?.innerText || '').split('\n').filter((l) => /admin|أدمن|موظف|استقبال|staff/i.test(l))
}));
const access = {};
for (const p of PAGES.filter((x) => x !== '/auth/login' && x !== '/this-page-does-not-exist')) {
  await go(page, p);
  const landed = new URL(page.url()).pathname;
  const toasts = await page.locator('app-toast-container').innerText().catch(() => '');
  access[p] = { landed, opened: landed === p, toast: toasts.trim().replace(/\s+/g, ' ').slice(0, 160) };
}
await ctx.close();
fs.writeFileSync(path.join(out, `${role}-nav.json`), JSON.stringify({ role, nav, access }, null, 2));
console.log(JSON.stringify({ role, links: nav.sidebarLinks.map((l) => `${l.text} → ${l.href}`), navbar: nav.navbarButtons, blocked: Object.entries(access).filter(([, v]) => !v.opened).map(([k, v]) => `${k} → ${v.landed} ${v.toast}`) }, null, 1));
