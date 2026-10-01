import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:4200';
const SCREENSHOT_DIR = 'C:\\Users\\fares\\.gemini\\antigravity-ide\\brain\\abcb34e5-3a58-4f40-bc18-880360e00d46\\audit_screenshots';

async function runVerification() {
  console.log('=== STARTING COMPREHENSIVE VERIFICATION OF ALL FIXES ===');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.warn('[Browser Error]:', msg.text());
  });

  // 1. LOGIN
  console.log('1. Logging in as admin...');
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
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
  await new Promise(r => setTimeout(r, 400));
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2500));

  // 2. CHECK CLASSROOM LIVE BOARD (show-classroom)
  console.log('2. Navigating to Classroom Live Board (/classroom/show-classroom)...');
  await page.goto(`${BASE_URL}/classroom/show-classroom`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'verify_live_board.png') });

  // Open New Booking Modal on Live Board
  console.log('3. Opening Booking Modal on Live Board...');
  await page.evaluate(() => {
    const btn = document.querySelector('app-primary-button button') || document.querySelector('app-primary-button');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'verify_live_board_booking_modal.png') });

  const modalState = await page.evaluate(() => {
    const modal = document.querySelector('.modal-card--booking');
    const occupiedCards = Array.from(document.querySelectorAll('.room-thumb-card--occupied'));
    const disabledCards = Array.from(document.querySelectorAll('.room-thumb-card--disabled'));
    const occupiedTags = Array.from(document.querySelectorAll('.room-thumb-occupied-tag'));
    const notesTextarea = document.querySelector('textarea');

    return {
      modalOpen: !!modal,
      occupiedCardsCount: occupiedCards.length,
      disabledCardsCount: disabledCards.length,
      occupiedTagsCount: occupiedTags.length,
      occupiedTagsText: occupiedTags.map(t => t.textContent?.trim()),
      hasNotesField: !!notesTextarea,
      notesPlaceholder: notesTextarea?.placeholder
    };
  });
  console.log('   Live Board Booking Modal State:', modalState);

  // Close booking modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.btn-close-modal') ||
      Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('إلغاء') || b.textContent?.includes('Cancel'));
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // 3. CHECK RESERVATIONS TIMELINE & DETAIL PANEL
  console.log('4. Navigating to Reservations Timeline (/classroom/reservation)...');
  await page.goto(`${BASE_URL}/classroom/reservation`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // Open first reservation detail panel
  const openedDetail = await page.evaluate(() => {
    const firstRow = document.querySelector('tbody tr');
    if (firstRow) {
      const moreBtn = firstRow.querySelector('.btn-more-options');
      if (moreBtn) moreBtn.click();
      return true;
    }
    return false;
  });

  if (openedDetail) {
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => {
      const viewBtn = Array.from(document.querySelectorAll('.action-menu-btn')).find(b => b.textContent?.includes('عرض') || b.textContent?.includes('View'));
      if (viewBtn) viewBtn.click();
    });
    await new Promise(r => setTimeout(r, 1200));
  }

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'verify_detail_panel_notes.png') });

  const detailInfo = await page.evaluate(() => {
    const notesCard = document.querySelector('.notes-detail-card');
    return {
      panelOpen: !!document.querySelector('.side-panel'),
      hasNotesCard: !!notesCard,
      notesText: notesCard?.querySelector('p')?.textContent?.trim()
    };
  });
  console.log('   Reservation Detail Panel:', detailInfo);

  // 4. TEST EDITING RESERVATION ACTIVITY, TIME & NOTES
  console.log('5. Clicking Edit Reservation from Detail Panel...');
  await page.click('.panel-btn--edit');
  await new Promise(r => setTimeout(r, 1200));

  // Handle recurring scope if present
  await page.evaluate(() => {
    const proceedBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('متابعة التعديل') || b.textContent?.includes('Continue to Edit'));
    if (proceedBtn) proceedBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  console.log('6. Editing activity, notes, and saving...');
  await page.evaluate(() => {
    const actInput = document.querySelector('input[placeholder*="تفاضل"], input[placeholder*="ورشة"], input[placeholder*="برمجة"]') || document.querySelectorAll('.row-grid-2 input[type="text"]')[1];
    const notesInput = document.querySelector('textarea');

    if (actInput) {
      actInput.value = 'كورس تطوير الويب الكامل - عملي';
      actInput.dispatchEvent(new Event('input', { bubbles: true }));
      actInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (notesInput) {
      notesInput.value = 'ملاحظات نهائية معتمدة: مطلوب 2 لابتوب إضافي وتجهيز الشاشات والضيافة الكاملة [V2-CONFIRMED]';
      notesInput.dispatchEvent(new Event('input', { bubbles: true }));
      notesInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'verify_edit_modal_filled.png') });

  // Click Save
  console.log('7. Clicking Save Button...');
  await page.click('button.btn-primary-modal');
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'verify_after_edit_saved.png') });

  // Re-open detail panel to verify updated notes & activity
  console.log('8. Re-opening Detail Panel to verify updated notes...');
  await page.evaluate(() => {
    const firstRow = document.querySelector('tbody tr');
    if (firstRow) {
      const moreBtn = firstRow.querySelector('.btn-more-options');
      if (moreBtn) moreBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    const viewBtn = Array.from(document.querySelectorAll('.action-menu-btn')).find(b => b.textContent?.includes('عرض') || b.textContent?.includes('View'));
    if (viewBtn) viewBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'verify_updated_notes_in_detail.png') });

  const finalCheck = await page.evaluate(() => {
    const act = document.querySelector('.activity-title')?.textContent?.trim();
    const notesCard = document.querySelector('.notes-detail-card');
    return {
      updatedActivityInDetail: act,
      updatedNotesInDetail: notesCard?.querySelector('p')?.textContent?.trim()
    };
  });
  console.log('=== FINAL VERIFICATION RESULT ===');
  console.log(finalCheck);

  await browser.close();
  console.log('=== VERIFICATION COMPLETED SUCCESSFULLY ===');
}

runVerification().catch(console.error);
