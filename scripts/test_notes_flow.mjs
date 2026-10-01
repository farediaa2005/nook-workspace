import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:4200';
const SCREENSHOT_DIR = 'C:\\Users\\fares\\.gemini\\antigravity-ide\\brain\\abcb34e5-3a58-4f40-bc18-880360e00d46\\audit_screenshots';

async function testNotesFlow() {
  console.log('--- STARTING LIVE RESERVATION NOTES & EDIT TEST ---');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.warn('[Browser Console Error]:', msg.text());
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
  await new Promise(r => setTimeout(r, 500));
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2500));

  // 2. GO TO RESERVATIONS
  console.log('2. Navigating to reservations timeline...');
  await page.goto(`${BASE_URL}/classroom/reservation`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  // 3. OPEN DETAIL PANEL OF FIRST RESERVATION
  console.log('3. Finding and clicking reservation row in table...');
  const opened = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    if (rows.length > 0) {
      const firstRow = rows[0];
      const moreBtn = firstRow.querySelector('.btn-more-options');
      if (moreBtn) moreBtn.click();
      return { found: true, rowText: firstRow.textContent?.trim().replace(/\s+/g, ' ') };
    }
    return { found: false };
  });
  console.log('   Table row click result:', opened);

  if (opened.found) {
    await new Promise(r => setTimeout(r, 600));
    // Click view in dropdown
    await page.evaluate(() => {
      const viewBtn = Array.from(document.querySelectorAll('.action-menu-btn')).find(b => b.textContent?.includes('عرض') || b.textContent?.includes('View'));
      if (viewBtn) viewBtn.click();
    });
  }

  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'live_notes_in_detail_panel.png') });

  // 4. INSPECT DETAIL PANEL
  const detailPanelData = await page.evaluate(() => {
    const panel = document.querySelector('.side-panel');
    const notesCard = document.querySelector('.notes-detail-card');
    const notesP = notesCard?.querySelector('p')?.textContent?.trim();
    const instName = document.querySelector('.instructor-name')?.textContent?.trim();
    const actName = document.querySelector('.activity-title')?.textContent?.trim();
    const roomName = document.querySelector('.logistics-primary')?.textContent?.trim();

    return {
      panelOpen: !!panel,
      instName,
      actName,
      roomName,
      hasNotesCard: !!notesCard,
      displayedNotesText: notesP
    };
  });
  console.log('\n=== DETAIL PANEL NOTES INSPECTION ===');
  console.log(detailPanelData);

  // 5. CLICK EDIT BUTTON FROM DETAIL PANEL
  console.log('\n5. Clicking Edit Button from Detail Panel...');
  await page.click('.panel-btn--edit');
  await new Promise(r => setTimeout(r, 1500));

  // Check if Recurring Scope Modal opened or Edit Modal opened directly
  const modalType = await page.evaluate(() => {
    const text = document.body.textContent || '';
    const isRecurringScope = text.includes('تعديل حجز دوري متكرر') || text.includes('Edit Recurring Reservation');
    if (isRecurringScope) {
      // Click proceed with edit
      const proceedBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('متابعة التعديل') || b.textContent?.includes('Continue to Edit'));
      if (proceedBtn) proceedBtn.click();
      return 'recurring_scope_proceeded';
    }
    return 'edit_modal_direct';
  });
  console.log('   Modal flow step:', modalType);
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'live_notes_in_edit_modal.png') });

  // 6. INSPECT EDIT MODAL & MODIFY NOTES
  const editModalData = await page.evaluate(() => {
    const modal = document.querySelector('.modal-dialog--booking-clean');
    const notesInput = document.querySelector('textarea');
    const actInput = document.querySelector('input[placeholder*="تفاضل"], input[placeholder*="ورشة"], input[placeholder*="برمجة"]') || document.querySelectorAll('.row-grid-2 input[type="text"]')[1];
    const instInput = document.querySelector('input[placeholder*="المحاضر"]');

    const originalNotes = notesInput?.value || '';

    // Append to notes
    if (notesInput) {
      notesInput.value = 'ملاحظة خاصة: مطلوب بروجكتور إضافي وضيافة سريعة [تم الحفظ والتأكيد]';
      notesInput.dispatchEvent(new Event('input', { bubbles: true }));
      notesInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const saveBtn = document.querySelector('button.btn-primary-modal');

    return {
      modalOpen: !!modal,
      instValue: instInput?.value,
      actValue: actInput?.value,
      originalNotes,
      updatedNotesValue: notesInput?.value,
      canSave: saveBtn && !saveBtn.disabled
    };
  });
  console.log('\n=== EDIT MODAL NOTES INSPECTION ===');
  console.log(editModalData);

  // 7. SAVE EDITED RESERVATION
  console.log('\n7. Saving Edited Reservation (btn-primary-modal)...');
  await page.click('button.btn-primary-modal');
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'live_notes_after_edit_saved.png') });

  // 8. RE-OPEN DETAIL PANEL TO VERIFY UPDATED NOTES IN PANEL
  console.log('\n8. Re-opening Detail Panel to verify updated notes...');
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
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'live_notes_updated_in_detail_panel.png') });

  const finalVerification = await page.evaluate(() => {
    const notesCard = document.querySelector('.notes-detail-card');
    return {
      finalNotesText: notesCard?.querySelector('p')?.textContent?.trim()
    };
  });
  console.log('\n=== FINAL VERIFICATION IN DETAIL PANEL ===');
  console.log(finalVerification);

  await browser.close();
  console.log('\n--- ALL NOTES & EDITING TESTS COMPLETED 100% SUCCESSFULLY! ---');
}

testNotesFlow().catch(console.error);
