import puppeteer from 'puppeteer-core';

async function test() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:4200/auth/login', { waitUntil: 'networkidle0' });
  await page.evaluate((u, p) => {
    document.querySelector('#email').value = u;
    document.querySelector('#email').dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#email').dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('#password').value = p;
    document.querySelector('#password').dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#password').dispatchEvent(new Event('change', { bubbles: true }));
  }, 'admin', 'Admin@123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2500));

  await page.goto('http://localhost:4200/classroom/reservation', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Clicking button.btn-primary-action inside app-primary-button...');
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('app-primary-button button, button.btn-primary-action');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Button clicked:', clicked);

  await new Promise(r => setTimeout(r, 1500));
  const isModalOpen = await page.evaluate(() => !!document.querySelector('.modal-dialog--booking-clean'));
  console.log('Modal opened:', isModalOpen);

  await browser.close();
}

test().catch(console.error);
