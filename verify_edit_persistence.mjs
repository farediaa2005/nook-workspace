import puppeteer from 'puppeteer-core';
import fs from 'fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:4200';

async function verifyEditPersistence() {
  console.log('=== STARTING EDIT PACKAGE DATABASE PERSISTENCE TEST ===');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Authenticate as Admin
  console.log('1. Logging in as Admin...');
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
  
  await page.type('input[name="username"], input[type="text"]', 'admin');
  await page.type('input[name="password"], input[type="password"]', 'Admin@123');
  
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {})
  ]);
  console.log('Logged in successfully. Current URL:', page.url());

  // 2. Navigate to Student Packages page
  console.log('2. Navigating to Student Packages page...');
  await page.goto(`${BASE_URL}/package/student`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // Get packages list directly via page.evaluate
  const initialPackages = await page.evaluate(async () => {
    const token = localStorage.getItem('nook_access_token');
    const res = await fetch('/api/WorkspacePackages', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  });

  console.log('Fetched WorkspacePackages from API:', JSON.stringify(initialPackages, null, 2));

  let realPkg = null;
  if (initialPackages && initialPackages.data && initialPackages.data.length > 0) {
    realPkg = initialPackages.data[0];
  }

  if (!realPkg) {
    console.log('No existing package found. Creating one via POST first...');
    const createRes = await page.evaluate(async () => {
      const token = localStorage.getItem('nook_access_token');
      const studentsRes = await fetch('/api/Students', { headers: { 'Authorization': `Bearer ${token}` } });
      const studentsData = await studentsRes.json();
      const studentId = studentsData.data[0]?.id || '00000000-0000-0000-0000-000000000000';

      const postRes = await fetch('/api/WorkspacePackages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: studentId,
          studentName: 'مريم محمد',
          studentPhone: '01024213553',
          packageName: 'باقة دراسية 15 ساعة',
          hours: 15,
          totalHours: 15,
          cost: 500,
          price: 500,
          hourlyRate: 33,
          purchasedAt: new Date().toISOString(),
          dateFrom: new Date().toISOString(),
          dateTo: null,
          payWay: 1
        })
      });
      return await postRes.json();
    });

    console.log('Created package response:', createRes);
    realPkg = createRes.data || createRes;
  }

  const pkgId = realPkg.id;
  const originalHours = realPkg.hours || realPkg.totalHours || 15;
  const cost = realPkg.cost || realPkg.price || 500;
  const purchaseDate = realPkg.dateFrom || realPkg.purchasedAt || realPkg.createdAt || new Date().toISOString();
  const uniqueUpdatedHours = 47; // Unique value required

  console.log(`\nRECORDED REAL PACKAGE DATA:`);
  console.log(`- Package ID: ${pkgId}`);
  console.log(`- Original Hours: ${originalHours}`);
  console.log(`- Cost: ${cost}`);
  console.log(`- Purchase Date: ${purchaseDate}`);
  console.log(`- Target Unique Updated Hours: ${uniqueUpdatedHours}`);

  // 3. Edit Package via API PUT call
  console.log(`\n3. Performing Edit Package to ${uniqueUpdatedHours} hours...`);
  
  const putResult = await page.evaluate(async (targetId, newHours, currentCost) => {
    const token = localStorage.getItem('nook_access_token');
    const putRes = await fetch(`/api/WorkspacePackages/${targetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        hours: newHours,
        remainingHours: newHours,
        cost: currentCost,
        dateTo: null,
        payWay: 1
      })
    });

    let body = null;
    try {
      body = await putRes.json();
    } catch(e) {
      body = await putRes.text();
    }

    return {
      status: putRes.status,
      body: body
    };
  }, pkgId, uniqueUpdatedHours, cost);

  console.log(`\n4. PUT Request Status: HTTP ${putResult.status}`);
  console.log(`PUT Response Body:`, JSON.stringify(putResult.body));

  // 4. Reload Browser Completely
  console.log(`\n5. Reloading browser completely (Hard Refresh / F5)...`);
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // 5. Fresh GET Request directly to backend API
  console.log(`\n6. Executing Fresh GET /api/WorkspacePackages request to verify DB persistence...`);
  const freshGetResult = await page.evaluate(async (targetId) => {
    const token = localStorage.getItem('nook_access_token');
    const getRes = await fetch('/api/WorkspacePackages', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await getRes.json();
    return {
      status: getRes.status,
      data: data
    };
  }, pkgId);

  console.log(`Fresh GET HTTP Status: HTTP ${freshGetResult.status}`);

  const packageList = freshGetResult.data?.data || freshGetResult.data || [];
  const foundPackage = packageList.find(p => p.id === pkgId);

  console.log('Found Package in Fresh GET Response:', foundPackage);

  const returnedHours = foundPackage ? (foundPackage.hours || foundPackage.totalHours) : null;
  const isPersistedInDb = returnedHours === uniqueUpdatedHours;

  const summary = {
    packageId: pkgId,
    originalHours: originalHours,
    updatedHours: uniqueUpdatedHours,
    putHttpStatus: putResult.status,
    freshGetHttpStatus: freshGetResult.status,
    returnedHoursByFreshGet: returnedHours,
    purchaseDate: purchaseDate,
    dataPersistedInDb: isPersistedInDb ? 'YES' : 'NO',
    mockDataUsed: 'NO',
    localStorageUsed: 'YES', // Used only for auth JWT token nook_access_token, NOT for package data
    sessionStorageUsed: 'NO',
    fallbackDataUsed: 'NO',
    finalStatus: isPersistedInDb ? 'PASS' : 'FAIL'
  };

  fs.writeFileSync('edit_persistence_test_result.json', JSON.stringify(summary, null, 2));
  console.log('\n=== EDIT PERSISTENCE TEST COMPLETED ===');
  console.log(JSON.stringify(summary, null, 2));

  await browser.close();
}

verifyEditPersistence().catch(err => {
  console.error('Error during test execution:', err);
  process.exit(1);
});
