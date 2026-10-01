import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:4200';
const SCREENSHOT_DIR = 'C:\\Users\\fares\\.gemini\\antigravity-ide\\brain\\abcb34e5-3a58-4f40-bc18-880360e00d46\\audit_screenshots';

async function runDeepOperations() {
  console.log('========================================================');
  console.log('   DEEP INTERACTIVE OPERATIONS AUDIT: SHIFT, CATERING, PAYMENTS');
  console.log('========================================================');

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
  console.log('\n1. Logging in as admin...');
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

  // 2. ACTIVE SHIFT AUDIT & CLOSE SHIFT MODAL AUDIT
  console.log('\n2. Auditing Shift & Close Shift Modal Calculations...');
  await page.goto(`${BASE_URL}/shift/active`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  // Check 4 channels data on screen
  const shiftChannelsData = await page.evaluate(() => {
    const cashEl = document.querySelector('.channel-card--cash .channel-amount');
    const vodafoneEl = document.querySelector('.channel-card--vodafone .channel-amount');
    const instapayEl = document.querySelector('.channel-card--instapay .channel-amount');
    const fawryEl = document.querySelector('.channel-card--fawry .channel-amount');
    const startingFloat = document.querySelector('.channel-card--cash .channel-footnote')?.textContent?.trim();

    return {
      cash: cashEl?.textContent?.trim() || '0.00',
      vodafone: vodafoneEl?.textContent?.trim() || '0.00',
      instapay: instapayEl?.textContent?.trim() || '0.00',
      fawry: fawryEl?.textContent?.trim() || '0.00',
      startingFloat
    };
  });
  console.log('   Shift Financial Channels:', shiftChannelsData);

  // Take screenshot of active shift
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'deep_active_shift.png') });

  // Open Close Shift Modal
  console.log('   Opening Close Shift Modal...');
  await page.click('.btn-close-shift');
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'deep_close_shift_modal.png') });

  const closeShiftCalc = await page.evaluate(() => {
    const modal = document.querySelector('.modal-backdrop, .close-shift-modal');
    if (!modal) return { modalFound: false };

    // Inspect inputs and calculation labels
    const actualCashInput = document.querySelector('input[type="number"], .input-actual-cash, input[name="actualCash"]');
    const expectedAmountText = document.querySelector('.expected-amount, .theoretical-cash')?.textContent?.trim();
    const diffText = document.querySelector('.diff-amount, .cash-difference')?.textContent?.trim();

    // Test typing actual cash into input
    if (actualCashInput) {
      actualCashInput.value = '600';
      actualCashInput.dispatchEvent(new Event('input', { bubbles: true }));
      actualCashInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const diffAfterInput = document.querySelector('.diff-amount, .cash-difference')?.textContent?.trim();

    // Close the modal without submitting to keep shift alive for testing
    const cancelBtn = document.querySelector('.btn-cancel, .btn-secondary, .modal-close');
    if (cancelBtn) cancelBtn.click();

    return {
      modalFound: true,
      expectedAmountText,
      initialDiff: diffText,
      diffAfterTyping600: diffAfterInput
    };
  });
  console.log('   Close Shift Modal Calculations:', closeShiftCalc);
  await new Promise(r => setTimeout(r, 800));

  // 3. CLASSROOM LIVE BOARD: ADD CATERING & CHECKOUT MODAL WITH ALL 4 CHANNELS
  console.log('\n3. Auditing Classroom Booking, Catering POS, and 4 Payment Channels...');
  await page.goto(`${BASE_URL}/classroom/show-classroom`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  // Check if any room is active or empty
  const classroomState = await page.evaluate(() => {
    const activeCards = document.querySelectorAll('.card-active');
    const emptyCards = document.querySelectorAll('.card-empty');
    return {
      activeCount: activeCards.length,
      emptyCount: emptyCards.length
    };
  });
  console.log('   Classroom state:', classroomState);

  // If no room is active, let's start a quick booking on an empty room!
  if (classroomState.activeCount === 0 && classroomState.emptyCount > 0) {
    console.log('   Starting a booking to test full live lifecycle...');
    await page.click('.btn-book-room');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'deep_new_classroom_booking_modal.png') });

    // Fill booking form
    const bookingFormResult = await page.evaluate(() => {
      // Find room thumbs, instructor select, etc.
      const firstAvailableRoom = document.querySelector('.room-thumb-card:not(.room-thumb-card--occupied)');
      if (firstAvailableRoom) firstAvailableRoom.click();

      const instructorInput = document.querySelector('input[placeholder*="المحاضر"], input[placeholder*="Instructor"], #instructorName');
      if (instructorInput) {
        instructorInput.value = 'د. مصطفى الشامي';
        instructorInput.dispatchEvent(new Event('input', { bubbles: true }));
        instructorInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const activityInput = document.querySelector('input[placeholder*="النشاط"], input[placeholder*="Activity"], #activityName');
      if (activityInput) {
        activityInput.value = 'كورس برمجة الويب وذكاء اصطناعي';
        activityInput.dispatchEvent(new Event('input', { bubbles: true }));
        activityInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const notesInput = document.querySelector('#resNotes, textarea[name="notes"]');
      if (notesInput) {
        notesInput.value = 'ملاحظات هامة: مطلوب شاشة عرض ومشروبات كاترنج';
        notesInput.dispatchEvent(new Event('input', { bubbles: true }));
        notesInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Click confirm/save button
      const submitBtn = document.querySelector('button.btn-primary, button[type="submit"], .btn-confirm-booking');
      if (submitBtn) {
        submitBtn.click();
        return { success: true };
      }
      return { success: false };
    });
    console.log('   Booking form submit result:', bookingFormResult);
    await new Promise(r => setTimeout(r, 2000));
  }

  // Refresh and check active cards
  await page.goto(`${BASE_URL}/classroom/show-classroom`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'deep_show_classroom_active.png') });

  // Test Catering POS modal
  console.log('   Testing Catering POS Modal on Classroom...');
  const cateringBtnClicked = await page.evaluate(() => {
    // Find catering button
    const btns = Array.from(document.querySelectorAll('button'));
    const catBtn = btns.find(b => b.textContent?.includes('كاترنج') || b.textContent?.includes('Catering'));
    if (catBtn) {
      catBtn.click();
      return true;
    }
    return false;
  });

  if (cateringBtnClicked) {
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'deep_catering_pos_modal.png') });

    const posModalDetails = await page.evaluate(() => {
      const modal = document.querySelector('.pos-modal-card');
      const products = Array.from(document.querySelectorAll('.product-card-pos, .pos-product-card, .catering-item')).map(p => ({
        title: p.querySelector('.name, .product-title, strong')?.textContent?.trim() || '',
        price: p.querySelector('.price, .product-price')?.textContent?.trim() || ''
      }));

      // Click first product to add to cart
      const firstProduct = document.querySelector('.product-card-pos, .pos-product-card, .catering-item');
      if (firstProduct) {
        firstProduct.click();
      }

      return {
        modalOpened: !!modal,
        productsCount: products.length,
        sampleProducts: products.slice(0, 3)
      };
    });
    console.log('   Catering POS Modal State:', posModalDetails);
    await new Promise(r => setTimeout(r, 800));

    // Verify item in cart and click Add to Room
    const addResult = await page.evaluate(() => {
      const cartTotal = document.querySelector('.pos-total-amount, .cart-total, .total-val')?.textContent?.trim();
      const addToRoomBtn = document.querySelector('.btn-add-to-room, .btn-confirm-catering, .btn-charge-room');
      const closeBtn = document.querySelector('.btn-close-modal');

      if (addToRoomBtn && !addToRoomBtn.disabled) {
        addToRoomBtn.click();
        return { action: 'added_to_room', cartTotal };
      } else if (closeBtn) {
        closeBtn.click();
        return { action: 'closed_modal', cartTotal };
      }
      return { action: 'none' };
    });
    console.log('   Catering Action Result:', addResult);
    await new Promise(r => setTimeout(r, 1500));
  }

  // Test Checkout Modal & All 4 Payment Methods
  console.log('\n4. Testing Checkout Modal & All 4 Payment Channels (Cash, Vodafone, InstaPay, Fawry)...');
  const checkoutBtnClicked = await page.evaluate(() => {
    const btn = document.querySelector('.action-btn--checkout');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  if (checkoutBtnClicked) {
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'deep_checkout_modal_initial.png') });

    const checkoutAudit = await page.evaluate(async () => {
      const modal = document.querySelector('.modal-dialog--checkout');
      if (!modal) return { error: 'Modal not opened' };

      // 1. Initial amounts
      const rentalTotal = document.querySelector('.breakdown-line:first-child .amount-number')?.textContent?.trim();
      const cateringTotal = document.querySelector('.line-amount .amount-number')?.textContent?.trim();
      const subtotal = document.querySelector('.subtotal-row .amount-number')?.textContent?.trim();

      // 2. Test Payment Method 1: Cash
      const cashBtn = document.querySelector('.payment-option-card:nth-child(1)');
      if (cashBtn) cashBtn.click();
      
      // Enter amount received
      const amtInput = document.querySelector('input.amount-received-input');
      if (amtInput) {
        amtInput.value = '500';
        amtInput.dispatchEvent(new Event('input', { bubbles: true }));
        amtInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const changeDueCash = document.querySelector('.change-amount')?.textContent?.trim();

      // 3. Test Payment Method 2: Vodafone Cash
      const vodafoneBtn = document.querySelector('.payment-option-card:nth-child(2)');
      if (vodafoneBtn) vodafoneBtn.click();
      const isVodafoneSelected = vodafoneBtn?.classList.contains('payment-option-card--active');

      // 4. Test Payment Method 3: Fawry
      const fawryBtn = document.querySelector('.payment-option-card:nth-child(3)');
      if (fawryBtn) fawryBtn.click();
      const isFawrySelected = fawryBtn?.classList.contains('payment-option-card--active');

      // 5. Test Payment Method 4: InstaPay
      const instapayBtn = document.querySelector('.payment-option-card:nth-child(4)');
      if (instapayBtn) instapayBtn.click();
      const isInstapaySelected = instapayBtn?.classList.contains('payment-option-card--active');

      // Switch back to Cash
      if (cashBtn) cashBtn.click();

      const canSubmit = !document.querySelector('.btn-process-checkout')?.disabled;

      // Close modal
      const closeBtn = document.querySelector('.btn-close-circle');
      if (closeBtn) closeBtn.click();

      return {
        rentalTotal,
        cateringTotal,
        subtotal,
        changeDueWith500: changeDueCash,
        channelsTested: {
          cash: true,
          vodafone: isVodafoneSelected,
          fawry: isFawrySelected,
          instapay: isInstapaySelected
        },
        canSubmit
      };
    });
    console.log('   Checkout Modal Audit Result:', checkoutAudit);
    await new Promise(r => setTimeout(r, 1000));
  }

  // 5. TIMELINE & DETAIL PANEL NOTES PERSISTENCE
  console.log('\n5. Auditing Timeline Notes & Room Occupied Status...');
  await page.goto(`${BASE_URL}/classroom/reservation`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'deep_reservation_timeline.png') });

  // Open first reservation detail panel
  const panelOpened = await page.evaluate(() => {
    const block = document.querySelector('.timeline-res-block, .res-card-block');
    if (block) {
      block.click();
      return true;
    }
    return false;
  });

  if (panelOpened) {
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'deep_reservation_detail_panel.png') });

    const panelData = await page.evaluate(() => {
      const panel = document.querySelector('.side-panel');
      const title = panel?.querySelector('.panel-title')?.textContent?.trim();
      const instructor = panel?.querySelector('.panel-instructor-name')?.textContent?.trim();
      const room = panel?.querySelector('.meta-badge-room')?.textContent?.trim();
      const notesSection = document.querySelector('.notes-detail-card');
      const notesText = notesSection?.querySelector('p')?.textContent?.trim();
      const editBtn = !!document.querySelector('.panel-btn--edit');

      return {
        panelVisible: !!panel,
        title,
        instructor,
        room,
        hasNotesSection: !!notesSection,
        notesText,
        hasEditBtn: editBtn
      };
    });
    console.log('   Detail Panel Data:', panelData);

    // Close panel
    await page.click('.panel-close-btn');
    await new Promise(r => setTimeout(r, 500));
  }

  await browser.close();
  console.log('\n========================================================');
  console.log('   DEEP AUDIT OPERATIONS COMPLETED SUCCESSFULLY!       ');
  console.log('========================================================');
}

runDeepOperations().catch(console.error);
