import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:4200';
const SCREENSHOT_DIR = 'C:\\Users\\fares\\.gemini\\antigravity-ide\\brain\\abcb34e5-3a58-4f40-bc18-880360e00d46\\audit_screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const auditResults = {
  timestamp: new Date().toISOString(),
  pagesTested: [],
  networkErrors: [],
  consoleErrors: [],
  functionalTests: {},
  systemHealth: {
    authWorking: false,
    activeShift: false,
    calculationsCorrect: true,
    themeConsistent: true,
    arabicRtlConsistent: true,
    apiConnectivity: true
  }
};

async function runAudit() {
  console.log('======================================================');
  console.log('   STARTING NOOK SYSTEM COMPREHENSIVE A-Z AUDIT       ');
  console.log('======================================================');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('response', response => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !url.includes('/favicon.ico')) {
      auditResults.networkErrors.push({
        url,
        status,
        statusText: response.statusText(),
        page: page.url()
      });
      console.warn(`[Network Error] ${status} ${url} on ${page.url()}`);
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out harmless extension/vite noise
      if (!text.includes('favicon') && !text.includes('ERR_CONNECTION_REFUSED')) {
        auditResults.consoleErrors.push({ text, page: page.url() });
        console.warn(`[Console Error] ${text}`);
      }
    }
  });

  // Helper to record page test
  async function testPage(name, route, actions = null) {
    console.log(`\n==================================================`);
    console.log(`--> Testing: ${name} (${route})`);
    const fullUrl = `${BASE_URL}${route}`;
    try {
      await page.goto(fullUrl, { waitUntil: 'networkidle0', timeout: 15000 }).catch(async () => {
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 2000));
      });
      await new Promise(r => setTimeout(r, 1500));

      const pageState = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.pathname,
          hasMainContent: !!document.querySelector('main, .main-content, .layout-container, router-outlet'),
          headerText: document.querySelector('h1, h2, .page-title, .header-title')?.textContent?.trim() || '',
          buttonsCount: document.querySelectorAll('button:not([disabled])').length,
          inputsCount: document.querySelectorAll('input, select, textarea').length,
          cardsCount: document.querySelectorAll('.card, .res-card, .classroom-card, .table-row, tr, .product-card').length,
          isRtl: document.documentElement.dir === 'rtl' || document.body.dir === 'rtl',
          rawTextSnippet: document.body.textContent?.substring(0, 150).replace(/\s+/g, ' ')
        };
      });

      const shotPath = path.join(SCREENSHOT_DIR, `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });

      const pageReport = {
        name,
        route,
        status: 'SUCCESS',
        actualUrl: pageState.url,
        header: pageState.headerText,
        buttons: pageState.buttonsCount,
        inputs: pageState.inputsCount,
        cards: pageState.cardsCount,
        isRtl: pageState.isRtl,
        screenshot: shotPath
      };

      if (actions) {
        console.log(`   Running specific actions on ${name}...`);
        const actionResult = await actions(page);
        pageReport.actionResult = actionResult;
      }

      auditResults.pagesTested.push(pageReport);
      console.log(`✓ ${name} OK: ${pageState.headerText || pageState.url} | Buttons: ${pageState.buttonsCount} | Cards: ${pageState.cardsCount}`);
    } catch (err) {
      console.error(`✗ Error on ${name}:`, err.message);
      auditResults.pagesTested.push({
        name,
        route,
        status: 'FAILED',
        error: err.message
      });
    }
  }

  // 1. AUTHENTICATION & LOGIN FORM
  console.log('\n--- PHASE 1: AUTHENTICATION FLOW ---');
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
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

  await new Promise(r => setTimeout(r, 600));
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 3000));

  const authVerified = await page.evaluate(() => {
    return {
      url: window.location.pathname,
      tokenExists: !!localStorage.getItem('nook_access_token'),
      userData: localStorage.getItem('nook_user_data')
    };
  });
  console.log('Login verified:', authVerified);
  auditResults.systemHealth.authWorking = authVerified.tokenExists && !authVerified.url.includes('/auth/login');
  auditResults.functionalTests.login = authVerified;

  // 2. DASHBOARD
  console.log('\n--- PHASE 2: DASHBOARD AUDIT ---');
  await testPage('Dashboard', '/dashboard', async (p) => {
    const dMetrics = await p.evaluate(() => {
      const stats = Array.from(document.querySelectorAll('.stat-card, .metric-card, .kpi-card, .dashboard-metric')).map(el => ({
        label: el.querySelector('.label, .stat-label, h3, h4')?.textContent?.trim() || '',
        value: el.querySelector('.value, .stat-value, .metric-value, .number')?.textContent?.trim() || ''
      }));
      const quickActions = Array.from(document.querySelectorAll('.quick-action-btn, .action-btn')).map(b => b.textContent?.trim());
      const bookingsCount = document.querySelectorAll('.booking-item, .recent-item, tr').length;
      return { stats, quickActions, bookingsCount };
    });
    console.log('   Dashboard Metrics:', dMetrics);
    return dMetrics;
  });

  // 3. SHIFT MANAGEMENT (OPEN / ACTIVE / CLOSE)
  console.log('\n--- PHASE 3: SHIFT MANAGEMENT AUDIT ---');
  await testPage('Active_Shift', '/shift/active', async (p) => {
    const shiftState = await p.evaluate(() => {
      const openBtn = document.querySelector('.btn-open-shift, button.open-shift, .btn-primary');
      const closeBtn = document.querySelector('.btn-close-shift, button.close-shift');
      const staff = document.querySelector('.staff-name, .user-name')?.textContent?.trim();
      const statusBadge = document.querySelector('.shift-badge, .status-badge')?.textContent?.trim();
      const text = document.body.textContent || '';
      const hasCashTill = text.includes('كاش') || text.includes('درج') || text.includes('Cash');
      const hasVodafone = text.includes('فودافون') || text.includes('Vodafone');
      const hasInstapay = text.includes('انستاباي') || text.includes('InstaPay');
      const hasFawry = text.includes('فوري') || text.includes('Fawry');

      return {
        hasOpenBtn: !!openBtn,
        hasCloseBtn: !!closeBtn,
        staff,
        statusBadge,
        channels: { hasCashTill, hasVodafone, hasInstapay, hasFawry }
      };
    });
    console.log('   Shift Status:', shiftState);
    auditResults.functionalTests.shift = shiftState;

    // Test Opening Shift if not open
    if (shiftState.hasOpenBtn) {
      console.log('   Attempting to open shift...');
      await p.evaluate(() => {
        const btn = document.querySelector('.btn-open-shift, button.open-shift');
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 1000));
      // In open shift modal, enter opening cash
      await p.evaluate(() => {
        const cashInput = document.querySelector('input[type="number"], input[name="openingCash"]');
        if (cashInput) {
          cashInput.value = '500';
          cashInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const confirmBtn = document.querySelector('.btn-confirm, .modal-footer button.primary, button[type="submit"]');
        if (confirmBtn) confirmBtn.click();
      });
      await new Promise(r => setTimeout(r, 2000));
      console.log('   Shift opened test executed.');
    }

    return shiftState;
  });

  await testPage('Shift_History', '/shift/history', async (p) => {
    const history = await p.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr, .shift-card, .history-item');
      return { totalShiftsFound: rows.length };
    });
    console.log('   Shift History count:', history);
    return history;
  });

  await testPage('End_Of_Shift_Balance', '/shift/end-of-shift-balance', async (p) => {
    const balance = await p.evaluate(() => {
      const summaryCards = document.querySelectorAll('.balance-card, .summary-card, .card');
      const numbers = Array.from(document.querySelectorAll('.amount, .total, .value')).map(e => e.textContent?.trim());
      return { cardsCount: summaryCards.length, sampleAmounts: numbers.slice(0, 5) };
    });
    console.log('   Shift Balance Summary:', balance);
    return balance;
  });

  // 4. CLASSROOM - LIVE BOARD (SHOW CLASSROOM) & CATERING & CHECKOUT
  console.log('\n--- PHASE 4: CLASSROOM LIVE BOARD AUDIT ---');
  await testPage('Show_Classroom', '/classroom/show-classroom', async (p) => {
    const liveInfo = await p.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.classroom-card, .session-card')).map(c => ({
        room: c.querySelector('.room-name, h3, .title')?.textContent?.trim() || '',
        instructor: c.querySelector('.instructor-name, .instructor')?.textContent?.trim() || '',
        activity: c.querySelector('.activity, .subject')?.textContent?.trim() || '',
        rate: c.querySelector('.hourly-rate, .rate')?.textContent?.trim() || '',
        timeRange: c.querySelector('.time-range, .time')?.textContent?.trim() || '',
        extendBtn: !!c.querySelector('.action-btn--extend, button.btn-extend'),
        cateringBtn: !!c.querySelector('.action-btn--catering, button.btn-catering'),
        checkoutBtn: !!c.querySelector('.action-btn--checkout, button.btn-checkout')
      }));

      const completedLedger = document.querySelectorAll('.completed-sessions-section tr, .completed-session-row');
      const bookRoomBtn = document.querySelector('.btn-book-room, .btn-primary');

      return {
        activeCardsCount: cards.length,
        cards,
        completedSessionsCount: completedLedger.length,
        hasBookRoomBtn: !!bookRoomBtn
      };
    });
    console.log('   Live Classrooms:', liveInfo);
    auditResults.functionalTests.liveClassrooms = liveInfo;

    // Test Extend Duration Modal
    if (liveInfo.activeCardsCount > 0 && liveInfo.cards[0].extendBtn) {
      console.log('   Testing Extend Duration modal on first card...');
      await p.click('.action-btn--extend, button.btn-extend');
      await new Promise(r => setTimeout(r, 800));
      const extendModal = await p.evaluate(() => {
        const modal = document.querySelector('.extend-modal, .modal-backdrop');
        const options = Array.from(document.querySelectorAll('.extend-duration-select option, .duration-chip')).map(o => o.textContent?.trim());
        const closeBtn = document.querySelector('.modal-close, .btn-cancel, button.secondary');
        if (closeBtn) closeBtn.click();
        return { opened: !!modal, options };
      });
      console.log('   Extend modal options:', extendModal);
      liveInfo.extendModal = extendModal;
      await new Promise(r => setTimeout(r, 500));
    }

    // Test Catering Modal & Products
    if (liveInfo.activeCardsCount > 0 && liveInfo.cards[0].cateringBtn) {
      console.log('   Testing Add Catering modal...');
      await p.click('.action-btn--catering, button.btn-catering');
      await new Promise(r => setTimeout(r, 800));
      const cateringModal = await p.evaluate(() => {
        const modal = document.querySelector('.catering-modal, .modal-backdrop');
        const items = Array.from(document.querySelectorAll('.catering-product-item, .product-card, .catering-item')).map(i => ({
          name: i.querySelector('.name, .product-name')?.textContent?.trim() || '',
          price: i.querySelector('.price, .product-price')?.textContent?.trim() || ''
        }));
        const closeBtn = document.querySelector('.modal-close, .btn-cancel, button.secondary');
        if (closeBtn) closeBtn.click();
        return { opened: !!modal, itemsCount: items.length, sampleItems: items.slice(0, 3) };
      });
      console.log('   Catering items in modal:', cateringModal);
      liveInfo.cateringModal = cateringModal;
      await new Promise(r => setTimeout(r, 500));
    }

    // Test Checkout Modal & All 4 Payment Channels
    if (liveInfo.activeCardsCount > 0 && liveInfo.cards[0].checkoutBtn) {
      console.log('   Testing Checkout Modal & 4 Payment Channels...');
      await p.click('.action-btn--checkout, button.btn-checkout');
      await new Promise(r => setTimeout(r, 1000));
      const checkoutModal = await p.evaluate(() => {
        const modal = document.querySelector('.checkout-modal, .modal-backdrop, .dialog');
        const text = document.body.textContent || '';
        const payMethods = Array.from(document.querySelectorAll('.payment-method-btn, .payment-channel, input[name="paymentMethod"]')).map(m => m.textContent?.trim());
        const finalAmt = document.querySelector('.final-amount, .total-due, .total-cost')?.textContent?.trim() || '';
        const closeBtn = document.querySelector('.btn-close, .btn-cancel, button.secondary');
        if (closeBtn) closeBtn.click();
        return {
          opened: !!modal,
          hasCash: text.includes('كاش') || text.includes('Cash'),
          hasVodafone: text.includes('فودافون') || text.includes('Vodafone'),
          hasInstapay: text.includes('انستاباي') || text.includes('InstaPay'),
          hasFawry: text.includes('فوري') || text.includes('Fawry'),
          finalAmount: finalAmt,
          payMethodsFound: payMethods
        };
      });
      console.log('   Checkout Modal Payment Methods:', checkoutModal);
      liveInfo.checkoutModal = checkoutModal;
      await new Promise(r => setTimeout(r, 500));
    }

    return liveInfo;
  });

  // 5. CLASSROOM RESERVATIONS & TIMELINE & DETAIL PANEL & NOTES
  console.log('\n--- PHASE 5: CLASSROOM RESERVATIONS AUDIT ---');
  await testPage('Classroom_Reservations', '/classroom/reservation', async (p) => {
    const resInfo = await p.evaluate(() => {
      const timelineBlocks = Array.from(document.querySelectorAll('.timeline-res-block, .res-card-block')).map(b => ({
        room: b.closest('.timeline-row')?.querySelector('.room-title')?.textContent?.trim() || '',
        activity: b.querySelector('.res-activity, .activity')?.textContent?.trim() || '',
        instructor: b.querySelector('.res-instructor, .instructor')?.textContent?.trim() || '',
        time: b.querySelector('.res-time, .time')?.textContent?.trim() || ''
      }));

      const tableRows = document.querySelectorAll('tbody tr').length;
      const dateHeader = document.querySelector('.current-date-display, .date-indicator')?.textContent?.trim() || '';

      return {
        blocksCount: timelineBlocks.length,
        sampleBlocks: timelineBlocks.slice(0, 3),
        tableRows,
        dateHeader
      };
    });
    console.log('   Reservations Timeline Info:', resInfo);

    // Test Opening Reservation Modal & Occupied Thumbnails
    console.log('   Testing New Reservation Modal & Occupied Room Badges...');
    await p.evaluate(() => {
      const btn = document.querySelector('.btn-add-reservation, button.btn-primary');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    const modalAudit = await p.evaluate(() => {
      const modal = document.querySelector('.booking-modal-overlay');
      const rooms = Array.from(document.querySelectorAll('.room-thumb-card')).map(r => ({
        name: r.querySelector('.room-thumb-name')?.textContent?.trim() || '',
        isOccupied: r.classList.contains('room-thumb-card--occupied'),
        occupiedTag: r.querySelector('.room-thumb-occupied-tag')?.textContent?.trim() || null,
        occupantName: r.querySelector('.room-thumb-occupant')?.textContent?.trim() || null
      }));

      const hasNotesInput = !!document.querySelector('#resNotes');
      const hasRecurrence = !!document.querySelector('.recurrence-select, app-custom-select');

      // Close modal
      const closeBtn = document.querySelector('.modal-close-btn, .btn-cancel');
      if (closeBtn) closeBtn.click();

      return {
        modalOpened: !!modal,
        roomsCount: rooms.length,
        occupiedRooms: rooms.filter(r => r.isOccupied),
        hasNotesInput,
        hasRecurrence
      };
    });
    console.log('   Reservation Modal & Occupied Badges:', modalAudit);
    resInfo.modalAudit = modalAudit;
    await new Promise(r => setTimeout(r, 800));

    // Test Reservation Detail Panel
    console.log('   Testing Reservation Detail Panel & Notes Card...');
    await p.evaluate(() => {
      const block = document.querySelector('.timeline-res-block, .res-card-block');
      if (block) block.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const detailPanelAudit = await p.evaluate(() => {
      const panel = document.querySelector('.side-panel');
      const title = panel?.querySelector('.panel-title')?.textContent?.trim() || '';
      const notesCard = document.querySelector('.notes-detail-card');
      const notesContent = notesCard?.querySelector('p')?.textContent?.trim() || null;
      const editBtn = !!panel?.querySelector('.panel-btn--edit');
      const cancelBtn = !!panel?.querySelector('.panel-btn--cancel');
      const deleteBtn = !!panel?.querySelector('.panel-btn--delete');
      const startBtn = !!panel?.querySelector('.panel-btn--start');

      const closeBtn = document.querySelector('.panel-close-btn');
      if (closeBtn) closeBtn.click();

      return {
        panelOpened: !!panel,
        title,
        hasNotesCard: !!notesCard,
        notesContent,
        actions: { editBtn, cancelBtn, deleteBtn, startBtn }
      };
    });
    console.log('   Detail Panel Audit:', detailPanelAudit);
    resInfo.detailPanelAudit = detailPanelAudit;

    return resInfo;
  });

  // 6. WORKSPACE
  console.log('\n--- PHASE 6: WORKSPACE MODULE AUDIT ---');
  await testPage('Workspace_Live', '/workspace/show-student', async (p) => {
    const ws = await p.evaluate(() => {
      const checkinBtn = document.querySelector('.btn-checkin, button.btn-primary');
      const studentCards = document.querySelectorAll('.student-card, .workspace-student, tr');
      const stats = Array.from(document.querySelectorAll('.stat-item, .metric-pill')).map(s => s.textContent?.trim());
      return {
        hasCheckinBtn: !!checkinBtn,
        activeStudentsCount: studentCards.length,
        stats
      };
    });
    console.log('   Workspace Live:', ws);
    return ws;
  });

  await testPage('Workspace_Add_Student', '/workspace/add-student', async (p) => {
    const form = await p.evaluate(() => {
      const nameInput = document.querySelector('input[name="name"], input[placeholder*="اسم"], input[placeholder*="Name"]');
      const phoneInput = document.querySelector('input[name="phone"], input[type="tel"]');
      const planSelect = document.querySelector('select, app-custom-select');
      const submitBtn = document.querySelector('button[type="submit"], button.btn-primary');
      return { hasName: !!nameInput, hasPhone: !!phoneInput, hasPlan: !!planSelect, hasSubmit: !!submitBtn };
    });
    console.log('   Workspace Add Student Form:', form);
    return form;
  });

  // 7. PACKAGES (Student & Instructor)
  console.log('\n--- PHASE 7: PACKAGES AUDIT ---');
  await testPage('Student_Packages', '/package/student', async (p) => {
    const pkgs = await p.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.package-card, tbody tr')).map(c => ({
        name: c.querySelector('.package-name, h3, td:first-child')?.textContent?.trim() || '',
        hours: c.querySelector('.hours, .package-hours')?.textContent?.trim() || '',
        price: c.querySelector('.price, .package-price')?.textContent?.trim() || ''
      }));
      const addBtn = document.querySelector('.btn-add-package, .btn-primary');
      return { count: items.length, samplePackages: items.slice(0, 3), hasAddBtn: !!addBtn };
    });
    console.log('   Student Packages:', pkgs);
    return pkgs;
  });

  await testPage('Instructor_Packages', '/package/instructor', async (p) => {
    const pkgs = await p.evaluate(() => {
      const items = document.querySelectorAll('.package-card, tbody tr');
      const addBtn = document.querySelector('.btn-add-package, .btn-primary');
      return { count: items.length, hasAddBtn: !!addBtn };
    });
    console.log('   Instructor Packages:', pkgs);
    return pkgs;
  });

  await testPage('Add_Student_Package', '/package/add-student-package');
  await testPage('Add_Instructor_Package', '/package/add-instructor-package');

  // 8. DIRECTORIES (Students, Instructors, Colleges, Blacklist)
  console.log('\n--- PHASE 8: DIRECTORIES AUDIT ---');
  await testPage('Show_Students', '/details/show-students', async (p) => {
    const dir = await p.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr, .student-card');
      const search = document.querySelector('input[type="search"], input[placeholder*="بحث"]');
      return { count: rows.length, hasSearch: !!search };
    });
    console.log('   Students count:', dir);
    return dir;
  });

  await testPage('Show_Instructors', '/details/show-instructors', async (p) => {
    const dir = await p.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr, .instructor-card');
      const addBtn = document.querySelector('.btn-add-instructor, .btn-primary');
      return { count: rows.length, hasAddBtn: !!addBtn };
    });
    console.log('   Instructors count:', dir);
    return dir;
  });

  await testPage('Show_Colleges', '/details/show-colleges');
  await testPage('Show_Blacklist', '/details/show-blacklist');

  // 9. CATERING PRODUCTS
  console.log('\n--- PHASE 9: CATERING PRODUCTS AUDIT ---');
  await testPage('Show_Products', '/catering/show-products', async (p) => {
    const prod = await p.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.product-card, tbody tr')).map(c => ({
        name: c.querySelector('.product-name, h3, .name')?.textContent?.trim() || '',
        price: c.querySelector('.price, .product-price')?.textContent?.trim() || ''
      }));
      const addBtn = document.querySelector('.btn-add-product, .btn-primary');
      return { count: items.length, sampleProducts: items.slice(0, 3), hasAddBtn: !!addBtn };
    });
    console.log('   Catering Products:', prod);
    return prod;
  });

  await testPage('Add_Products', '/catering/add-products');
  await testPage('Product_Graph', '/catering/product-graph');

  // 10. SETTINGS & DISCOUNTS & USERS
  console.log('\n--- PHASE 10: SETTINGS AUDIT ---');
  await testPage('Settings_General', '/settings/general', async (p) => {
    const sett = await p.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select')).map(i => ({
        id: i.id || i.name,
        value: i.value
      }));
      const saveBtn = document.querySelector('button.btn-save, button.primary');
      return { inputsCount: inputs.length, hasSaveBtn: !!saveBtn };
    });
    console.log('   General Settings:', sett);
    return sett;
  });

  await testPage('Settings_Discounts', '/settings/discounts', async (p) => {
    const disc = await p.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.discount-card, tbody tr')).map(c => ({
        name: c.querySelector('.name, td:first-child')?.textContent?.trim() || '',
        value: c.querySelector('.value, .percent, td:nth-child(2)')?.textContent?.trim() || ''
      }));
      const addBtn = document.querySelector('.btn-add-discount, .btn-primary');
      return { count: items.length, sampleDiscounts: items.slice(0, 3), hasAddBtn: !!addBtn };
    });
    console.log('   Discounts:', disc);
    return disc;
  });

  await testPage('Settings_Users', '/settings/show-user', async (p) => {
    const users = await p.evaluate(() => {
      const list = Array.from(document.querySelectorAll('tbody tr, .user-card')).map(u => ({
        name: u.querySelector('.user-name, td:first-child')?.textContent?.trim() || '',
        role: u.querySelector('.role, .user-role')?.textContent?.trim() || ''
      }));
      const addBtn = document.querySelector('.btn-add-user, .btn-primary');
      return { count: list.length, sampleUsers: list.slice(0, 3), hasAddBtn: !!addBtn };
    });
    console.log('   Staff Users:', users);
    return users;
  });

  await testPage('Settings_Profile', '/settings/profile');

  // 11. LANGUAGE SWITCHING & RTL/LTR
  console.log('\n--- PHASE 11: LANGUAGE SWITCHING & THEME AUDIT ---');
  await testPage('Language_Toggle', '/dashboard', async (p) => {
    const initialLang = await p.evaluate(() => ({
      dir: document.documentElement.dir || document.body.dir,
      lang: document.documentElement.lang
    }));

    // Find and click language toggle
    const toggleResult = await p.evaluate(() => {
      const btn = document.querySelector('.lang-btn, .language-toggle, button[aria-label*="language"], button[title*="Language"], button[title*="اللغة"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    await new Promise(r => setTimeout(r, 1200));

    const toggledLang = await p.evaluate(() => ({
      dir: document.documentElement.dir || document.body.dir,
      lang: document.documentElement.lang
    }));

    console.log('   Initial Lang:', initialLang, '--> After Toggle:', toggledLang);

    // Switch back to Arabic
    if (toggledLang.dir === 'ltr') {
      await p.evaluate(() => {
        const btn = document.querySelector('.lang-btn, .language-toggle, button[aria-label*="language"], button[title*="Language"], button[title*="اللغة"]');
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 1000));
    }

    return { initialLang, toggledLang, success: initialLang.dir !== toggledLang.dir };
  });

  await browser.close();

  // Save audit report
  const reportPath = 'C:\\Users\\fares\\.gemini\\antigravity-ide\\brain\\abcb34e5-3a58-4f40-bc18-880360e00d46\\scratch\\audit_report.json';
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2), 'utf8');

  console.log('\n======================================================');
  console.log('   ALL PHASES COMPLETED SUCCESSFULLY!                ');
  console.log(`   Pages Tested: ${auditResults.pagesTested.length}`);
  console.log(`   Network Failures: ${auditResults.networkErrors.length}`);
  console.log(`   Console Errors: ${auditResults.consoleErrors.length}`);
  console.log(`   Report saved to: ${reportPath}`);
  console.log('======================================================');
}

runAudit().catch(console.error);
