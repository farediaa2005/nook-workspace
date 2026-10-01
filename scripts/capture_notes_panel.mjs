import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:4200';
const SCREENSHOT_DIR = 'C:\\Users\\fares\\.gemini\\antigravity-ide\\brain\\abcb34e5-3a58-4f40-bc18-880360e00d46\\audit_screenshots';

async function captureScrolled() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(BASE_URL + '/auth/login', { waitUntil: 'networkidle0' });
  await page.evaluate((u, p) => {
    document.querySelector('#email').value = u;
    document.querySelector('#email').dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#email').dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('#password').value = p;
    document.querySelector('#password').dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#password').dispatchEvent(new Event('change', { bubbles: true }));
  }, 'admin', 'Admin@123');
  await new Promise(r => setTimeout(r, 400));
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2500));

  await page.goto(BASE_URL + '/classroom/reservation', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  await page.evaluate(() => {
    const firstRow = document.querySelector('tbody tr');
    if (firstRow) {
      const moreBtn = firstRow.querySelector('.btn-more-options');
      if (moreBtn) moreBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => {
    const viewBtn = Array.from(document.querySelectorAll('.action-menu-btn')).find(b => b.textContent?.includes('عرض') || b.textContent?.includes('View'));
    if (viewBtn) viewBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  // Check and scroll panel body down
  const resData = await page.evaluate(() => {
    const panelBody = document.querySelector('.panel-body');
    const notesCard = document.querySelector('.notes-detail-card');
    if (panelBody) {
      panelBody.scrollTop = 9999;
    }
    return {
      hasNotesCard: !!notesCard,
      notesText: notesCard?.querySelector('p')?.textContent?.trim() || notesCard?.textContent?.trim(),
      scrollTop: panelBody?.scrollTop,
      scrollHeight: panelBody?.scrollHeight,
      clientHeight: panelBody?.clientHeight
    };
  });
  console.log('Panel Data after scroll:', resData);
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'verify_detail_panel_scrolled_notes.png') });
  await browser.close();
  console.log('Scrolled screenshot saved successfully!');
}
captureScrolled().catch(console.error);
