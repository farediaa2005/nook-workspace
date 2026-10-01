import puppeteer from 'puppeteer-core';

async function test() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', res => {
    if (res.status() >= 400) console.log('ERR RESP:', res.status(), res.url());
  });

  await page.goto('http://localhost:4200/auth/login', { waitUntil: 'networkidle0' });
  await page.evaluate((u, p) => {
    const emailInput = document.querySelector('#email');
    const pwdInput = document.querySelector('#password');
    emailInput.value = u;
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    pwdInput.value = p;
    pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
    pwdInput.dispatchEvent(new Event('change', { bubbles: true }));
  }, 'admin', 'Admin@123');

  await new Promise(r => setTimeout(r, 600));
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 4000));
  console.log('After submit URL:', page.url());

  const token1 = await page.evaluate(() => localStorage.getItem('nook_access_token'));
  console.log('Token1 exists:', !!token1);

  // Now test navigating to /classroom/show-classroom
  console.log('Navigating to /classroom/show-classroom...');
  await page.goto('http://localhost:4200/classroom/show-classroom', { waitUntil: 'networkidle0' });
  console.log('Classroom URL:', page.url());
  const token2 = await page.evaluate(() => localStorage.getItem('nook_access_token'));
  console.log('Token2 exists after nav:', !!token2);

  await browser.close();
}

test().catch(console.error);
