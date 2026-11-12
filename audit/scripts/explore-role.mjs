// Walks every page as one role and clicks every visible, non-destructive button (opens modals, menus,
// tabs, filters), then tries an EMPTY submit in each opened modal. Nothing is saved: buttons whose text
// means save / confirm / delete / pay / close-shift / logout are never clicked, and every modal is closed
// before the next click. Records console errors and failed requests per click.
// Usage: node explore-role.mjs <role> [pagesCsv]  → audit/logs/roles/<role>-explore.json + .md
import fs from 'node:fs';
import path from 'node:path';
import { start, go, PAGES } from './e2e-lib.mjs';

const role = process.argv[2] || 'staff';
const only = process.argv[3] ? process.argv[3].split(',') : null;
const outDir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'logs', 'roles');
const shotDir = path.resolve(outDir, '..', '..', 'screenshots', 'roles', role);
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(shotDir, { recursive: true });

// Never clicked (would write, delete, pay, log out or leave the page)
const UNSAFE = /اخرج|خروج|sign out|log out|^نشط$|^موقوف$|^active$|^inactive$|toggle|حذف|امسح|مسح|delete|remove|تأكيد|أكد|confirm|سيف|حفظ|save|ضيف المنتج|إتمام|دفع|pay|checkout|تشيك أوت|قفل|close shift|لوج أوت|logout|تسجيل الخروج|إلغاء الحجز|كنسل التبليك|ارفع|block|تبليك|بدء الجلسة|بدء الشفت|start|فتح شيفت|submit|إرسال|نعم|yes|reset|استعادة|export|تصدير|تحميل|download|print|طباعة|kernel|تطبيق|apply|ضيف ل|سجل|تسجيل دخول/i;
const SUBMIT_IN_MODAL = /سيف|حفظ|save|ضيف|أضف|add|تأكيد|confirm|إنشاء|create/i;

const { ctx, page } = await start({ role });
const report = {};
// 'Leave site?' (beforeunload) is accepted so navigation continues; any confirm()/alert() is dismissed (never confirms an action)
page.on('dialog', async (d) => { note('dialogs', `${d.type()}: ${d.message().slice(0, 120)}`); if (d.type() === 'beforeunload') await d.accept(); else await d.dismiss(); });
let current = null;
const note = (k, v) => current && (current[k] ||= []).push(v);
page.on('console', (m) => { if (m.type() === 'error') note('errors', m.text().slice(0, 200)); });
page.on('pageerror', (e) => note('errors', 'PAGEERROR ' + String(e.message).slice(0, 200)));
page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/api/')) note('failed', `${r.request().method()} ${r.url().replace(/^.*?\/api/, '/api')} ${r.status()}`); });
page.on('request', (r) => { if (r.method() !== 'GET' && r.url().includes('/api/') && !r.url().includes('AuditLogs')) note('writes', `${r.method()} ${r.url().replace(/^.*?\/api/, '/api')}`); });

const overlayOpen = () => page.evaluate(() => [...document.querySelectorAll('.modal-overlay, .modal-backdrop, .modal-backdrop-custom, [role="dialog"], .drawer, .add-item-overlay, .menu-backdrop, .action-dropdown-card')].some((e) => e.getClientRects().length));
const closeAll = async () => {
  for (let i = 0; i < 3 && await overlayOpen(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
};

for (const route of PAGES.filter((p) => !only || only.includes(p))) {
  if (route === '/auth/login' || route === '/this-page-does-not-exist') continue;
  const pageRep = report[route] = { landed: '', clicks: [] };
  current = pageRep;
  try { await go(page, route); } catch (e) { pageRep.error = e.message.split('\n')[0]; continue; }
  pageRep.landed = new URL(page.url()).pathname;
  if (pageRep.landed !== route) continue;
  const labels = await page.evaluate(() => [...document.querySelectorAll('main button, main [role="tab"], main a[href^="/"], main .clickable')]
    .filter((b) => b.getClientRects().length && !b.disabled)
    .map((b) => (b.innerText || b.getAttribute('aria-label') || b.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 50))
    .filter(Boolean));
  const unique = [...new Set(labels)].slice(0, 40);
  for (const label of unique) {
    const click = { label };
    current = click;
    if (UNSAFE.test(label)) { click.skipped = 'unsafe'; pageRep.clicks.push(click); continue; }
    try {
      if (new URL(page.url()).pathname !== route) await go(page, route);
      const el = page.locator('main').getByText(label, { exact: true }).filter({ visible: true }).first();
      if (!(await el.count())) { click.skipped = 'not found'; pageRep.clicks.push(click); continue; }
      await el.click({ timeout: 3000 });
      await page.waitForTimeout(700);
      click.after = new URL(page.url()).pathname;
      click.opened = await overlayOpen();
      if (click.opened) {
        const dlg = page.locator('.modal-overlay, .modal-backdrop, .modal-backdrop-custom, [role="dialog"], .drawer, .add-item-overlay').filter({ visible: true }).last();
        click.modalTitle = (await dlg.locator('h1,h2,h3,.modal-title').first().innerText().catch(() => '')).trim().slice(0, 60);
        // empty-submit check: the first submit-like button in the modal, only if it is enabled
        const submit = dlg.getByRole('button').filter({ hasText: SUBMIT_IN_MODAL });
        // only on ADD forms: an edit form is pre-filled, so its save button is not an empty submit
        if (await submit.count() && !/تعديل|إيديت|edit|update/i.test(click.modalTitle + ' ' + label)) {
          const btn = submit.last();
          click.submitDisabledWhenEmpty = await btn.isDisabled();
          if (!click.submitDisabledWhenEmpty) {
            // clicking with an untouched (empty) form: must be rejected client-side, never sent
            const before = (current.writes || []).length;
            await btn.click({ timeout: 2000 }).catch(() => {});
            await page.waitForTimeout(900);
            click.emptySubmitSentRequest = (current.writes || []).length > before;
            click.emptySubmitFeedback = (await page.locator('[class*="error"], .field-error, app-toast-container').filter({ visible: true }).allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ').slice(0, 200);
          }
        }
        await page.screenshot({ path: path.join(shotDir, `${route.replace(/\W+/g, '_')}__${label.replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 30)}.png`) });
        await closeAll();
        click.closedWithEscape = !(await overlayOpen());
        if (!click.closedWithEscape) await go(page, route);
      }
    } catch (e) {
      click.error = e.message.split('\n')[0].slice(0, 160);
      await go(page, route).catch(() => {});
    }
    pageRep.clicks.push(click);
    current = pageRep;
  }
}
await ctx.close();
fs.writeFileSync(path.join(outDir, `${role}-explore.json`), JSON.stringify(report, null, 1));

const md = [`# Explore — ${role}`, ''];
for (const [route, r] of Object.entries(report)) {
  md.push(`## ${route}${r.error ? ` → ⚠ ${r.error}` : (r.landed !== route ? ` → redirected to ${r.landed}` : '')}`);
  const pageFails = [...new Set(r.failed || [])];
  if (pageFails.length) md.push(`- page load failed requests: ${pageFails.join(', ')}`);
  for (const c of r.clicks) {
    const bits = [];
    if (c.skipped) bits.push(`skipped (${c.skipped})`);
    if (c.opened) bits.push(`opened "${c.modalTitle || 'overlay'}"`);
    if (c.after && c.after !== route) bits.push(`navigated → ${c.after}`);
    if (c.submitDisabledWhenEmpty === true) bits.push('submit disabled when empty');
    if (c.emptySubmitSentRequest) bits.push('⚠ EMPTY SUBMIT SENT A REQUEST');
    if (c.submitDisabledWhenEmpty === false && !c.emptySubmitSentRequest) bits.push(`empty submit blocked: "${c.emptySubmitFeedback || 'no visible message'}"`);
    if (c.opened && c.closedWithEscape === false) bits.push('⚠ Escape did not close it');
    if (c.failed?.length) bits.push(`⚠ failed: ${[...new Set(c.failed)].join(', ')}`);
    if (c.errors?.length) bits.push(`⚠ console: ${[...new Set(c.errors)].slice(0, 2).join(' / ')}`);
    if (c.writes?.length) bits.push(`writes: ${c.writes.join(', ')}`);
    if (c.error) bits.push(`⚠ ${c.error}`);
    md.push(`- **${c.label}** — ${bits.join('; ') || 'no change'}`);
  }
  md.push('');
}
fs.writeFileSync(path.join(outDir, `${role}-explore.md`), md.join('\n'));
console.log(md.filter((l) => /⚠|redirected|^## /.test(l)).join('\n'));
