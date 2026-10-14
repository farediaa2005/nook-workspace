const https = require('https');

function apiCall(path, method = 'GET', token = null, payload = null) {
  return new Promise((resolve, reject) => {
    const data = payload ? JSON.stringify(payload) : null;
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (data) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = https.request('https://nook.runasp.net' + path, {
      method,
      headers
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  const loginRes = await apiCall('/api/Auth/login', 'POST', null, {
    identifier: 'admin',
    password: 'Admin@123'
  });
  const token = loginRes.body?.data?.accessToken || loginRes.body?.accessToken;
  const user = loginRes.body?.data?.user || loginRes.body?.user;
  const userId = user?.id || 'aa6bd42a-0d24-41a0-b1ac-91cb640af6e6';

  // 1. Close current open shift if any
  const currRes = await apiCall(`/api/Shifts/open/${userId}`, 'GET', token);
  if (currRes.body?.data?.id) {
    const oldId = currRes.body.data.id;
    console.log('Closing existing open shift:', oldId);
    const closeRes = await apiCall(`/api/Shifts/${oldId}/close`, 'PUT', token, {
      timeTo: new Date().toISOString(),
      administrative: 250,
      actualVodafone: 0,
      actualInstapay: 0,
      actualFawry: 0,
      note: 'Closed prior shift before experiment'
    });
    console.log('Close result:', closeRes.status, closeRes.body?.message || closeRes.body);
  }

  // 2. Open TEST shift with: cash 250 / Vodafone 3450 / InstaPay 202 / Fawry 0
  console.log('\n--- Opening TEST Shift ---');
  const now = new Date();
  const openPayload = {
    date: now.toISOString(),
    timeFrom: now.toISOString(),
    previousTotal: 250,
    startVodafoneCash: 3450,
    startInstapay: 202,
    startFawry: 0,
    userId: userId
  };
  const openRes = await apiCall('/api/Shifts', 'POST', token, openPayload);
  console.log('Open shift POST status:', openRes.status);
  console.log('Open shift POST response:', JSON.stringify(openRes.body, null, 2));

  const newShiftId = openRes.body?.data?.id || openRes.body?.id;
  if (!newShiftId) {
    console.error('Failed to open test shift!');
    return;
  }

  // 3. Read it back via GET /api/Shifts/current and GET /api/Shifts/{id}
  console.log('\n--- Reading back shift via GET /api/Shifts/current ---');
  const readCurrent = await apiCall('/api/Shifts/current', 'GET', token);
  console.log(JSON.stringify(readCurrent.body, null, 2));

  console.log('\n--- Reading back shift via GET /api/Shifts/{id} ---');
  const readById = await apiCall(`/api/Shifts/${newShiftId}`, 'GET', token);
  console.log(JSON.stringify(readById.body, null, 2));

  // 4. Test Recalculate
  console.log('\n--- Testing POST /api/Shifts/{id}/recalculate ---');
  const recalcRes = await apiCall(`/api/Shifts/${newShiftId}/recalculate`, 'POST', token);
  console.log(JSON.stringify(recalcRes.body, null, 2));

  // 5. Test close with counted values
  console.log('\n--- Testing Shift Close with counted values ---');
  // Say counted cash = 250, vodafone = 3450, instapay = 202, fawry = 0
  const testCloseRes = await apiCall(`/api/Shifts/${newShiftId}/close`, 'PUT', token, {
    timeTo: new Date().toISOString(),
    administrative: 250, // testing if administrative is used for counted cash
    actualVodafone: 3450,
    actualInstapay: 202,
    actualFawry: 0,
    note: 'TEST shift close experiment'
  });
  console.log('Close status:', testCloseRes.status);
  console.log('Close response:', JSON.stringify(testCloseRes.body, null, 2));
}

run().catch(console.error);
