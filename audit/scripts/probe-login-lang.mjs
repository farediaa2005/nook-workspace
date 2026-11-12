import { start, go } from './e2e-lib.mjs';
for (const lang of ['ar', 'en']) {
  process.env.LANG_UI = lang;
  const { ctx, page } = await start({ role: 'guest', width: 1440 });
  let errors = 0; page.on('console', (m) => { if (m.type() === 'error') errors++; });
  await go(page, '/auth/login');
  const text = await page.locator('body').innerText();
  const raw = text.match(/\blogin[A-Z]\w+/g) || [];
  await page.screenshot({ path: `../screenshots/c4-06/lang/login-${lang}.png` });
  console.log(lang, JSON.stringify({ rawKeys: raw, undefined: (text.match(/undefined/g) || []).length, errors, sample: text.replace(/\s+/g, ' ').slice(0, 120) }));
  await ctx.close();
}
