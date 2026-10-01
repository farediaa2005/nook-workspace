import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:4200';

async function test() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log('HTTP ERROR:', res.status(), res.url());
    }
  });

  // Login via API
  const authPayload = JSON.stringify({ identifier: 'admin', password: 'Admin@123' });
  const authResponse = await fetch('https://nook.runasp.net/api/Auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: authPayload
  }).then(r => r.json());

  const authData = authResponse.data || authResponse;
  const token = authData.accessToken || authData.token;
  const refreshToken = authData.refreshToken;
  const account = authData.account;

  console.log('Token:', token ? token.substring(0, 20) + '...' : 'none');

  // Go to login page first to initialize domain localStorage
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });

  // Type in login form and click submit (real user flow)
  console.log('Filling login form via Puppeteer...');
  await page.evaluate((u, p) => {
    const emailInput = document.querySelector('#email');
    const pwdInput = document.querySelector('#password');
    if (emailInput && pwdInput) {
      emailInput.value = u;
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      pwdInput.value = p;
      pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
      pwdInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, 'admin', 'Admin@123');

  await new Promise(r => setTimeout(r, 500));

  console.log('Submitting login form...');
  await page.click('button[type="submit"]');

  await new Promise(r => setTimeout(r, 3000));
  console.log('URL after form submit:', page.url());

  const storage = await page.evaluate(() => {
    return {
      token: !!localStorage.getItem('nook_access_token'),
      user: localStorage.getItem('nook_user_data')
    };
  });
  console.log('Storage after submit:', storage);

  await browser.close();
}

test().catch(console.error);
