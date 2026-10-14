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

  const workhiveId = '74233e5c-c3ae-4525-b645-6ee73337f3f4';
  const meetingRoomId = 'a3bb756d-1256-4ba3-b996-d3a66085eb4a';

  console.log('--- Step 1: Create TEST Reservation (2h: 10:00 - 12:00) on 2026-11-20 ---');
  const createPayload = {
    roomId: workhiveId,
    activity: 'TEST-Reservation-Pass',
    dateFrom: '2026-11-20T00:00:00.000Z',
    dateTo: '2026-11-20T00:00:00.000Z',
    timeFrom: '2026-11-20T10:00:00.000Z',
    timeTo: '2026-11-20T12:00:00.000Z',
    reservationCost: 60,
    note: 'Automated Test Record',
    isOngoing: false
  };
  const createRes = await apiCall('/api/Reservations', 'POST', token, createPayload);
  console.log('Create status:', createRes.status);
  console.log('Create response:', JSON.stringify(createRes.body, null, 2));

  const testId = createRes.body?.data?.id || createRes.body?.id;
  if (!testId) {
    console.error('Failed to create reservation! Aborting.');
    return;
  }
  console.log('Created TEST reservation ID:', testId);

  try {
    console.log('\n--- Step 2: Extend TEST Reservation (2h -> 3h: 10:00 - 13:00) via PUT /api/Reservations/{id} ---');
    const updatePayload = {
      roomId: workhiveId,
      activity: 'TEST-Reservation-Pass',
      dateFrom: '2026-11-20T00:00:00.000Z',
      dateTo: '2026-11-20T00:00:00.000Z',
      timeFrom: '2026-11-20T10:00:00.000Z',
      timeTo: '2026-11-20T13:00:00.000Z',
      reservationCost: 90,
      note: 'Extended to 3h',
      isOngoing: false
    };
    const updateRes = await apiCall(`/api/Reservations/${testId}`, 'PUT', token, updatePayload);
    console.log('Extend PUT status:', updateRes.status);
    console.log('Extend PUT response:', JSON.stringify(updateRes.body, null, 2));

    console.log('\n--- Step 3: Move TEST Reservation to Meeting room via PUT ---');
    const movePayload = {
      ...updatePayload,
      roomId: meetingRoomId
    };
    const moveRes = await apiCall(`/api/Reservations/${testId}`, 'PUT', token, movePayload);
    console.log('Move PUT status:', moveRes.status);
    console.log('Move PUT response:', JSON.stringify(moveRes.body, null, 2));

    console.log('\n--- Step 4: Verify in GET /api/Reservations if duplicate exists ---');
    const listRes = await apiCall('/api/Reservations', 'GET', token);
    const all = listRes.body?.data || listRes.body || [];
    const matched = all.filter(r => (r.activity || '').includes('TEST-Reservation-Pass') || r.id === testId);
    console.log(`Matched reservations count for test: ${matched.length}`);
    matched.forEach(m => console.log(`- ID: ${m.id}, Room: ${m.roomName} (${m.roomId}), Times: ${m.timeFrom} - ${m.timeTo}`));

  } finally {
    console.log('\n--- Step 5: Clean up (DELETE /api/Reservations/{id}) ---');
    const delRes = await apiCall(`/api/Reservations/${testId}`, 'DELETE', token);
    console.log('Delete status:', delRes.status, delRes.body);
  }
}

run().catch(console.error);
