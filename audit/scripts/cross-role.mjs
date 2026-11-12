// Cross-role flows: the receptionist acts, the admin watches an already-open page (no reload),
// then reloads. Creates test records (one reservation, one workspace session) — nothing is deleted.
// Usage: node cross-role.mjs reservation|session
import fs from 'node:fs';
import path from 'node:path';
import { start, go, click, toasts, api } from './e2e-lib.mjs';

const flow = process.argv[2] || 'reservation';
const outDir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'logs', 'roles');
const shots = path.resolve(outDir, '..', '..', 'screenshots', 'roles', 'cross');
fs.mkdirSync(shots, { recursive: true });
const log = [];
const say = (k, v) => { const line = `${k} ${typeof v === 'string' ? v : JSON.stringify(v)}`; log.push(line); console.log(line); };

const admin = await start({ role: 'admin' });
const staff = await start({ role: 'staff' });
const watchFails = (p, who) => p.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/api/') && !/operational-alerts|AuditLogs|Analysis\//.test(r.url())) say(`${who} FAILED`, `${r.request().method()} ${r.url().replace(/^.*?\/api/, '/api')} ${r.status()}`); });
watchFails(admin.page, 'admin');
watchFails(staff.page, 'staff');
staff.page.on('request', (r) => { if (r.method() !== 'GET' && r.url().includes('/api/') && !r.url().includes('AuditLogs')) say('staff WRITE', `${r.method()} ${r.url().replace(/^.*?\/api/, '/api')} ${(r.postData() || '').slice(0, 160)}`); });

try {
  if (flow === 'reservation') {
    const date = '2026-11-18';
    await go(admin.page, '/classroom/reservation');
    await admin.page.locator('input[type=date]').first().fill(date);
    await admin.page.waitForTimeout(1500);
    const rowsBefore = await admin.page.locator('table tbody tr').allInnerTexts();
    say('admin rows before', rowsBefore.map((t) => t.replace(/\s+/g, ' ').slice(0, 80)));

    // receptionist creates a one-off reservation
    await go(staff.page, '/classroom/reservation');
    await click(staff.page, 'حجز جديد');
    await staff.page.waitForTimeout(900);
    const m = staff.page.locator('.modal-overlay, .modal-backdrop, [role=dialog]').filter({ visible: true }).last();
    await m.locator('input[placeholder="ابحث أو اكتب اسم المحاضر..."]').fill('منى');
    await staff.page.waitForTimeout(1000);
    await m.getByText('منى عادل', { exact: false }).filter({ visible: true }).first().click();
    await m.locator('input[placeholder^="مثال: ورشة"]').fill('حجز من الاستقبال');
    await m.locator('input[type=date]').fill(date);
    for (const [ph, val] of [['09:00 AM', '01:00 PM'], ['11:00 AM', '03:00 PM']]) {
      await m.locator(`input[placeholder="${ph}"]`).fill(val);
      await m.getByText('الموعد والتوقيت').first().click().catch(() => {});
    }
    await m.getByRole('button', { name: 'سيف' }).click();
    await staff.page.waitForTimeout(3000);
    say('staff toasts', await toasts(staff.page));
    await staff.page.screenshot({ path: path.join(shots, 'res-staff-after-save.png') });

    // admin page left open — does it update by itself?
    await admin.page.waitForTimeout(Number(process.env.WAIT || 15000));
    say('admin rows after WAIT ms (no reload)', (await admin.page.locator('table tbody tr').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').slice(0, 80)));
    await admin.page.reload();
    await admin.page.waitForTimeout(2500);
    await admin.page.locator('input[type=date]').first().fill(date);
    await admin.page.waitForTimeout(1500);
    say('admin rows after reload', (await admin.page.locator('table tbody tr').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').slice(0, 80)));
    await admin.page.screenshot({ path: path.join(shots, 'res-admin-after-reload.png') });
  }

  if (flow === 'session') {
    const shiftNow = async (p) => { const d = (await api(p, '/api/shifts/current')).data; return d && { id: d.id?.slice(0, 8), cash: d.expectedCash, ws: d.workspaceRevenue, total: d.totalRevenue, tx: d.transactionsCount }; };
    await go(admin.page, '/shift/active');
    say('admin shift before', await shiftNow(admin.page));
    say('staff sees shift', await shiftNow(staff.page));
    const ledgerBefore = await admin.page.locator('table tbody tr').count();

    // receptionist checks in an existing student
    await go(staff.page, '/workspace/show-student?openCheckIn=true');
    await staff.page.locator('input[placeholder="سيرش باسم الستيودنت أو رقم موبايله..."]').fill('عمر');
    await staff.page.waitForTimeout(1200);
    await staff.page.getByText('عمر خالد', { exact: false }).filter({ visible: true }).first().click();
    await staff.page.waitForTimeout(800);
    say('staff toasts after pick', await toasts(staff.page));
    await click(staff.page, 'شيرد سبيس');
    await staff.page.getByText('Open Space', { exact: true }).filter({ visible: true }).first().click();
    await click(staff.page, 'مفتوحة براحته');
    await click(staff.page, 'تأكيد تسجيل الدخول');
    await staff.page.waitForTimeout(3500);
    say('staff toasts after check-in', await toasts(staff.page));

    // admin workspace page: opened BEFORE the check-in would be ideal; here it is opened after and left open
    await go(admin.page, '/workspace/show-student');
    const adminSeesActive = await admin.page.locator('tr', { hasText: 'عمر خالد' }).count();
    say('admin sees the session (fresh load)', adminSeesActive > 0);

    // receptionist checks out (cash, exact amount)
    await go(staff.page, '/workspace/show-student');
    await staff.page.locator('tr', { hasText: 'عمر خالد' }).first().getByRole('button', { name: 'تشيك أوت' }).first().click();
    await staff.page.waitForTimeout(2000);
    const text = (await staff.page.locator('app-checkout-modal').innerText()).replace(/\s+/g, ' ');
    const due = Number((text.match(/إجمالي الحساب المطلوب[^\d]*([\d.,]+)/)?.[1] || '0').replace(/,/g, ''));
    say('staff checkout due', due);
    if (due > 0) await staff.page.locator('.amount-received-input').fill(String(due));
    await staff.page.locator('.btn-process-checkout').click();
    await staff.page.waitForTimeout(4000);
    say('staff toasts after checkout', await toasts(staff.page));

    // admin pages left open
    await admin.page.waitForTimeout(Number(process.env.WAIT || 15000));
    say('admin workspace row still shown as active after WAIT ms (no reload)', await admin.page.locator('tr', { hasText: 'عمر خالد' }).count());
    await go(admin.page, '/shift/active');
    say('admin shift after (navigated)', await shiftNow(admin.page));
    say('admin ledger rows before/after', [ledgerBefore, await admin.page.locator('table tbody tr').count()]);
    await admin.page.screenshot({ path: path.join(shots, 'session-admin-shift-after.png') });
    await go(admin.page, '/shift/history');
    await admin.page.screenshot({ path: path.join(shots, 'session-admin-history.png') });
  }
} catch (e) {
  say('CRASH', e.message.split('\n')[0]);
  await staff.page.screenshot({ path: path.join(shots, `${flow}-crash-staff.png`) }).catch(() => {});
  await admin.page.screenshot({ path: path.join(shots, `${flow}-crash-admin.png`) }).catch(() => {});
}
fs.writeFileSync(path.join(outDir, `cross-${flow}.log`), log.join('\n'));
await admin.ctx.close();
await staff.ctx.close();
