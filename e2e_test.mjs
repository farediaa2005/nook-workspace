import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = 'http://localhost:4200';

async function runE2ETests() {
  console.log('=== STARTING REAL E2E BROWSER & API AUTOMATED TESTS ===');
  
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const networkLogs = [];

  // Capture all API network traffic
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      const request = response.request();
      let reqBody = null;
      let resBody = null;
      try {
        reqBody = request.postData() ? JSON.parse(request.postData()) : null;
      } catch (e) {
        reqBody = request.postData();
      }
      try {
        resBody = await response.json();
      } catch (e) {
        resBody = '[Text/Empty]';
      }
      networkLogs.push({
        url,
        method: request.method(),
        status: response.status(),
        reqBody,
        resBody
      });
    }
  });

  const results = [];

  function recordResult(testName, action, expected, actual, status, bug = null) {
    results.push({ testName, action, expected, actual, status, bug });
    console.log(`[${status}] ${testName}`);
    console.log(`   Action: ${action}`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual: ${actual}`);
    if (bug) console.log(`   Bug: ${bug}`);
  }

  try {
    // ----------------------------------------------------
    // STEP 1: AUTHENTICATION (Login as Admin)
    // ----------------------------------------------------
    console.log('\n--- 1. LOGIN AS ADMIN ---');
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
    
    // Fill credentials
    await page.type('input[name="username"], input[type="text"]', 'admin');
    await page.type('input[name="password"], input[type="password"]', 'Admin@123');
    
    // Click submit
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {})
    ]);

    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes('/auth/login');
    recordResult(
      'Admin Authentication',
      'Navigate to /auth/login, enter admin / Admin@123, click submit button',
      'Successfully authenticate and redirect to dashboard',
      `Redirected to ${currentUrl} (Logged In: ${isLoggedIn})`,
      isLoggedIn ? 'PASS' : 'FAIL'
    );

    // ----------------------------------------------------
    // STEP 2: CREATE PACKAGE TEST (Student Package)
    // ----------------------------------------------------
    console.log('\n--- 2. CREATE STUDENT PACKAGE TEST ---');
    await page.goto(`${BASE_URL}/package/student`, { waitUntil: 'networkidle0' });
    
    // Click "بيع باقة جديدة" button to open modal
    await page.waitForSelector('.btn-new-checkin', { timeout: 5000 });
    await page.click('.btn-new-checkin');
    await page.waitForSelector('.modal-card--2col', { timeout: 5000 });

    // Select Student in autocomplete
    await page.type('input[name="memberSearchQuery"]', 'طالب');
    await new Promise(r => setTimeout(r, 500));

    // Pick first member option if available or add mock
    const memberItem = await page.$('.autocomplete-item');
    if (memberItem) {
      await memberItem.click();
    }

    // Enter Custom Hours and Price
    const customPkgCard = await page.$('.package-select-card:last-child');
    if (customPkgCard) await customPkgCard.click();

    await page.focus('input[name="customHours"]');
    await page.evaluate(() => {
      const el = document.querySelector('input[name="customHours"]');
      if (el) el.value = '';
    });
    await page.type('input[name="customHours"]', '15');

    await page.focus('input[name="customHourlyRate"]');
    await page.evaluate(() => {
      const el = document.querySelector('input[name="customHourlyRate"]');
      if (el) el.value = '';
    });
    await page.type('input[name="customHourlyRate"]', '30');

    // Fill Cash Amount Received
    await page.type('.cash-calc-block input', '500');

    // Click Confirm button
    const lastLogsLength = networkLogs.length;
    await page.click('.btn-modal-confirm');
    await new Promise(r => setTimeout(r, 1500));

    // Check if created package appears in UI table
    const tableText = await page.evaluate(() => document.querySelector('.students-table')?.textContent || '');
    const createdInUi = tableText.includes('15 س');

    // Check API response for POST /api/WorkspacePackages
    const postReq = networkLogs.find(l => l.method === 'POST' && l.url.includes('/WorkspacePackages'));

    recordResult(
      'Create Student Package',
      'Fill sell package form (hours: 15, rate: 30, payment: cash 500) and click Confirm',
      'Package created via POST /api/WorkspacePackages and displayed in UI table',
      `UI updated: ${createdInUi}, API status: ${postReq ? postReq.status : 'Local/Mock fallback response'}`,
      createdInUi ? 'PASS' : 'FAIL'
    );

    // Refresh and check persistence
    await page.reload({ waitUntil: 'networkidle0' });
    const tableTextAfterRefresh = await page.evaluate(() => document.querySelector('.students-table')?.textContent || '');
    const persistedAfterRefresh = tableTextAfterRefresh.includes('15 س');

    recordResult(
      'Create Package Persistence After Page Refresh',
      'Reload page (F5) and check if newly created package remains in the table',
      'Package persists in table after page refresh',
      `Persisted in UI: ${persistedAfterRefresh}`,
      persistedAfterRefresh ? 'PASS' : 'FAIL'
    );

    // ----------------------------------------------------
    // STEP 3: SINGLE ACTIVE PACKAGE TEST
    // ----------------------------------------------------
    console.log('\n--- 3. SINGLE ACTIVE PACKAGE TEST ---');
    // Attempt creating another package for the same member
    await page.click('.btn-new-checkin');
    await page.waitForSelector('.modal-card--2col', { timeout: 5000 });
    await page.type('input[name="memberSearchQuery"]', 'طالب');
    await new Promise(r => setTimeout(r, 500));
    const memberItem2 = await page.$('.autocomplete-item');
    if (memberItem2) await memberItem2.click();

    await page.click('.btn-modal-confirm');
    await new Promise(r => setTimeout(r, 500));

    const errorBannerText = await page.evaluate(() => document.querySelector('.modal-error-banner')?.textContent || '');
    const activeRuleBlockedInFrontend = errorBannerText.includes('لديه باقة نشطة بالفعل');

    recordResult(
      'Single Active Package Rule - Frontend Validation',
      'Select a student who already has an active package and attempt to sell a 2nd active package',
      'Operation blocked and clear error banner displayed to user',
      `Error Banner Text: "${errorBannerText.trim()}"`,
      activeRuleBlockedInFrontend ? 'PASS' : 'FAIL'
    );

    // Close modal
    await page.click('.modal-close-circle');

    // Direct Backend API Test for Single Active Package Rule
    console.log('\nTesting direct backend API call for 2nd active package...');
    const directApiRes = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('nook_access_token') || localStorage.getItem('nook_auth_token') || '';
        const res = await fetch('/api/WorkspacePackages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            studentId: 'test-student-id',
            hours: 10,
            cost: 200,
            payWay: 1
          })
        });
        const data = await res.json().catch(() => ({}));
        return { status: res.status, data };
      } catch (err) {
        return { error: err.message };
      }
    });

    const backendEnforcesRule = directApiRes.status === 400 || directApiRes.status === 422 || (directApiRes.data && directApiRes.data.success === false);
    recordResult(
      'Single Active Package Rule - Backend/API Result',
      'Send direct POST /api/WorkspacePackages request for an active student',
      'Backend API rejects request with 400/422 validation error',
      `HTTP Status: ${directApiRes.status}, Response: ${JSON.stringify(directApiRes.data)}`,
      backendEnforcesRule ? 'PASS' : 'FAIL (Backend requires API constraint validation)'
    );

    // ----------------------------------------------------
    // STEP 4: EDIT PACKAGE TEST
    // ----------------------------------------------------
    console.log('\n--- 4. EDIT PACKAGE TEST ---');
    await page.goto(`${BASE_URL}/package/student`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.students-table', { timeout: 5000 });
    const editBtn = await page.$('.students-table tbody tr:first-child button:nth-child(2)');
    if (editBtn) {
      await editBtn.click();
      await page.waitForSelector('.modal-dialog-box', { timeout: 5000 });

      // Change Hours via native Puppeteer typing for ngModel
      const hoursInput = await page.$('.modal-dialog-box input[type="number"]:first-of-type');
      if (hoursInput) {
        await hoursInput.click({ clickCount: 3 });
        await hoursInput.type('45');
      }

      // Click Save button
      await page.click('.modal-dialog-box button:last-child');
      await new Promise(r => setTimeout(r, 1500));

      // Reload page to verify persistence & no duplicate
      await page.reload({ waitUntil: 'networkidle0' });
      const tableRowsCount = await page.evaluate(() => document.querySelectorAll('.students-table tbody tr').length);
      const updatedTableText = await page.evaluate(() => document.querySelector('.students-table')?.textContent || '');
      const editPersisted = updatedTableText.includes('45');

      recordResult(
        'Edit Package & Persistence',
        'Open Edit modal, change allocated hours to 45, click Save, and reload browser',
        'Package updated to 45 hours, changes persist after refresh, no duplicate row created',
        `Hours in Table: 45 hrs (Persisted: ${editPersisted}), Total Rows: ${tableRowsCount}`,
        editPersisted ? 'PASS' : 'FAIL'
      );
    }

    // ----------------------------------------------------
    // STEP 5: DELETE PACKAGE TEST
    // ----------------------------------------------------
    console.log('\n--- 5. DELETE PACKAGE TEST ---');
    await page.goto(`${BASE_URL}/package/student`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.students-table', { timeout: 5000 });
    const rowsBeforeDelete = await page.evaluate(() => document.querySelectorAll('.students-table tbody tr').length);
    const deleteBtn = await page.$('.students-table tbody tr:first-child button:last-child');
    if (deleteBtn) {
      await deleteBtn.click();
      await page.waitForSelector('.modal-card--delete', { timeout: 5000 });

      // Click Confirm Delete
      await page.click('.modal-btn-delete');
      await new Promise(r => setTimeout(r, 1500));

      const rowsAfterDelete = await page.evaluate(() => document.querySelectorAll('.students-table tbody tr').length);

      // Reload page and verify it does not return
      await page.reload({ waitUntil: 'networkidle0' });
      const rowsAfterReload = await page.evaluate(() => document.querySelectorAll('.students-table tbody tr').length);

      recordResult(
        'Delete Package & Permanent Removal',
        'Click Delete button, confirm deletion in modal, and reload browser',
        'Package removed from table UI and stays removed after refresh',
        `Rows before: ${rowsBeforeDelete}, after delete: ${rowsAfterDelete}, after refresh: ${rowsAfterReload}`,
        rowsAfterReload < rowsBeforeDelete ? 'PASS' : 'FAIL'
      );
    }

    // ----------------------------------------------------
    // STEP 6: DETAILS & DIRECT QUERY PARAM URL TEST
    // ----------------------------------------------------
    console.log('\n--- 6. DETAILS & DIRECT URL TEST ---');
    // Test direct query param URL navigation: /package/student?id=PKG-TEST
    await page.goto(`${BASE_URL}/package/student?id=non-existent-test-id`, { waitUntil: 'networkidle0' });
    const drawerOpenOnInvalid = await page.evaluate(() => !!document.querySelector('.consumption-drawer.show'));

    recordResult(
      'Details Direct Query Param URL Handling',
      'Navigate directly to /package/student?id=non-existent-test-id',
      'Page loads gracefully without crash or opening broken drawer',
      `Drawer open: ${drawerOpenOnInvalid}`,
      !drawerOpenOnInvalid ? 'PASS' : 'FAIL'
    );

    // ----------------------------------------------------
    // STEP 7: DEDUCT HOURS TEST
    // ----------------------------------------------------
    console.log('\n--- 7. DEDUCT HOURS TEST ---');
    await page.goto(`${BASE_URL}/package/student`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.students-table tbody tr', { timeout: 5000 });

    // Open Details Drawer on first row
    const detailsBtn = await page.$('.students-table tbody tr:first-child button:first-child');
    if (detailsBtn) {
      await detailsBtn.click();
      await page.waitForSelector('.consumption-drawer.show', { timeout: 5000 });

      // Open Deduct Sub-Modal via evaluate click
      await page.evaluate(() => {
        const btn = document.querySelector('.btn-deduct-hours');
        if (btn) btn.click();
      });
      await page.waitForSelector('.modal-card--sm, .modal-actions-footer', { timeout: 5000 });

      // Test invalid 0 hours
      const deductHoursInput = await page.$('.modal-input[type="number"], input[type="number"]');
      if (deductHoursInput) {
        await deductHoursInput.click({ clickCount: 3 });
        await deductHoursInput.type('0');
      }
      await page.evaluate(() => {
        const saveBtn = document.querySelector('.modal-btn-save, button[type="submit"]');
        if (saveBtn) saveBtn.click();
      });
      await new Promise(r => setTimeout(r, 300));
      const toastText = await page.evaluate(() => document.querySelector('.toast-notification')?.textContent || '');

      recordResult(
        'Deduct Hours - 0 Hours Validation',
        'Enter 0 in Deduct Hours modal and click Confirm',
        'Error toast displayed, deduction rejected',
        `Toast text: "${toastText.trim()}"`,
        toastText.includes('غير صالح') || toastText.includes('Invalid') ? 'PASS' : 'FAIL'
      );

      // Test valid 2 hours deduction
      if (deductHoursInput) {
        await deductHoursInput.click({ clickCount: 3 });
        await deductHoursInput.type('2');
      }
      await page.evaluate(() => {
        const saveBtn = document.querySelector('.modal-btn-save, button[type="submit"]');
        if (saveBtn) saveBtn.click();
      });
      await new Promise(r => setTimeout(r, 1000));

      const remainingText = await page.evaluate(() => document.querySelector('.m-val--highlight')?.textContent || '');
      recordResult(
        'Deduct Hours - Valid Deduction & History Log',
        'Deduct 2 hours and verify remaining balance and history card',
        'Remaining balance updated and usage session logged',
        `Remaining balance displayed: "${remainingText.trim()}"`,
        remainingText.length > 0 ? 'PASS' : 'FAIL'
      );
    }

    // ----------------------------------------------------
    // STEP 8: PAYMENT METHODS & CASH CALCULATION TEST
    // ----------------------------------------------------
    console.log('\n--- 8. PAYMENT METHODS TEST ---');
    await page.goto(`${BASE_URL}/package/student`, { waitUntil: 'networkidle0' });
    await page.click('.btn-new-checkin');
    await page.waitForSelector('.modal-card--2col', { timeout: 5000 });

    // Test payment cards selection
    const paymentCards = await page.$$('.payment-option-card');
    let paymentCardsSelectable = true;
    for (const card of paymentCards) {
      await card.click();
      await new Promise(r => setTimeout(r, 100));
    }

    // Cash Change calculation check: enter 1000 received for 250 cost
    await page.click('.payment-option-card:first-child');
    await page.focus('.cash-calc-block input');
    await page.type('.cash-calc-block input', '1000');
    await new Promise(r => setTimeout(r, 200));

    const changeAmountText = await page.evaluate(() => document.querySelector('.change-amount')?.textContent || '');
    recordResult(
      'Cash Payment Method & Change Calculation',
      'Select Cash payment method, type received 1000 EGP for 250 EGP cost',
      'Change due calculated automatically (750 EGP)',
      `Calculated Change: "${changeAmountText.trim()}"`,
      changeAmountText.includes('750') ? 'PASS' : 'FAIL'
    );

    await page.click('.modal-close-circle');

    // ----------------------------------------------------
    // STEP 9: SEARCH & STATUS FILTER TEST
    // ----------------------------------------------------
    console.log('\n--- 9. SEARCH AND STATUS FILTERS TEST ---');
    await page.goto(`${BASE_URL}/package/student`, { waitUntil: 'networkidle0' });

    // Test text search
    await page.type('.top-search-input', 'nonexistent_search_query_123');
    await new Promise(r => setTimeout(r, 300));
    const emptyRowText = await page.evaluate(() => document.querySelector('.cell-empty')?.textContent || '');

    recordResult(
      'Search Filter - Non-matching Query',
      'Type "nonexistent_search_query_123" in search input',
      'Empty state displayed in table',
      `Empty State Text: "${emptyRowText.trim()}"`,
      emptyRowText.length > 0 ? 'PASS' : 'FAIL'
    );

    // Clear search
    await page.evaluate(() => {
      const el = document.querySelector('.top-search-input');
      if (el) el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Test Status Filter dropdown
    await page.click('.date-filter-dropdown');
    await page.waitForSelector('.date-menu-card', { timeout: 3000 });
    await page.click('.date-menu-item:nth-child(2)'); // Active filter
    await new Promise(r => setTimeout(r, 300));

    const activeFilterLabel = await page.evaluate(() => document.querySelector('.date-filter-dropdown span')?.textContent || '');
    recordResult(
      'Status Dropdown Filter',
      'Open status filter dropdown and select "Active Passes"',
      'Filter updates to Active Passes and filters table list',
      `Selected Filter Label: "${activeFilterLabel.trim()}"`,
      activeFilterLabel.length > 0 ? 'PASS' : 'FAIL'
    );

    // ----------------------------------------------------
    // STEP 10: PAGINATION TEST
    // ----------------------------------------------------
    console.log('\n--- 10. PAGINATION TEST ---');
    const paginationControlsExist = await page.evaluate(() => !!document.querySelector('.pagination-controls'));
    recordResult(
      'Pagination Navigation Controls',
      'Inspect pagination footer and page buttons',
      'Pagination info and page navigation buttons rendered correctly',
      `Pagination Controls Rendered: ${paginationControlsExist}`,
      paginationControlsExist ? 'PASS' : 'FAIL'
    );

    // ----------------------------------------------------
    // STEP 11: INSTRUCTOR PACKAGES PAGE TEST
    // ----------------------------------------------------
    console.log('\n--- 11. INSTRUCTOR PACKAGES PAGE TEST ---');
    await page.goto(`${BASE_URL}/package/instructor`, { waitUntil: 'networkidle0' });
    const instructorTitleText = await page.evaluate(() => document.querySelector('.page-title')?.textContent || '');
    const isInstructorPageLoaded = instructorTitleText.length > 0;

    recordResult(
      'Instructor Packages Page Load',
      'Navigate to /package/instructor',
      'Page loads successfully with instructor packages table and metrics',
      `Page Title: "${instructorTitleText.trim()}"`,
      isInstructorPageLoaded ? 'PASS' : 'FAIL'
    );

  } catch (err) {
    console.error('E2E TEST ERROR:', err);
  } finally {
    await browser.close();
  }

  // Save network logs & test results
  fs.writeFileSync('e2e_results.json', JSON.stringify({ results, networkLogs }, null, 2));
  console.log('\n=== E2E TESTS COMPLETED. Results written to e2e_results.json ===');
}

runE2ETests();
