import { start, go } from './e2e-lib.mjs';
for (const role of ['admin', 'staff']) {
  const { ctx, page } = await start({ role });
  await go(page, '/dashboard');
  const r = await page.evaluate(async () => { const t = localStorage.getItem('nook_access_token') || ''; const x = await fetch('/api/Auth/me', { headers: { Authorization: `Bearer ${t}` } }); const y = await fetch('/api/shifts/current', { headers: { Authorization: `Bearer ${t}` } }); return [x.status, y.status]; });
  console.log(role, 'landed', new URL(page.url()).pathname, 'me/shift', r);
  await ctx.close();
}
