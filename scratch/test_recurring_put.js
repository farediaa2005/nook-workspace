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

  console.log('--- Step 1: Create TEST Recurring Reservation (Weekly, 2 sessions: 2026-11-20 and 2026-11-27) ---');
  // In .NET DayOfWeek: Friday = 5
  const createPayload = {
    roomId: workhiveId,
    activity: 'TEST-Recurring-Conflict-Check',
    dateFrom: '2026-11-20T00:00:00.000Z',
    dateTo: '2026-11-27T00:00:00.000Z',
    timeFrom: '2026-11-20T14:00:00.000Z',
    timeTo: '2026-11-20T16:00:00.000Z',
    recurrenceFrequency: 2, // Weekly
    recurrenceInterval: 1,
    daysOfWeek: [5],
    totalSessions: 2,
    reservationCost: 120,
    isOngoing: false
  };
  const createRes = await apiCall('/api/Reservations', 'POST', token, createPayload);
  console.log('Create recurring status:', createRes.status);
  console.log('Create recurring response:', JSON.stringify(createRes.body, null, 2));

  const testId = createRes.body?.data?.id || createRes.body?.id;
  if (!testId) return;

  try {
    console.log('\n--- Step 2: Test check-conflict on this reservation WITHOUT excludeReservationId ---');
    const conflictNoExclude = await apiCall('/api/Reservations/check-conflict', 'POST', token, {
      roomId: workhiveId,
      dateFrom: '2026-11-20T00:00:00.000Z',
      dateTo: '2026-11-27T00:00:00.000Z',
      timeFrom: '2026-11-20T14:00:00.000Z',
      timeTo: '2026-11-20T17:00:00.000Z', // 14:00 - 17:00 (extended)
      recurrenceFrequency: 2,
      recurrenceInterval: 1,
      daysOfWeek: [5],
      totalSessions: 2
    });
    console.log('Conflict WITHOUT exclude status:', conflictNoExclude.status, JSON.stringify(conflictNoExclude.body, null, 2));

    console.log('\n--- Step 3: Test check-conflict WITH excludeReservationId ---');
    const conflictWithExclude = await apiCall('/api/Reservations/check-conflict', 'POST', token, {
      roomId: workhiveId,
      dateFrom: '2026-11-20T00:00:00.000Z',
      dateTo: '2026-11-27T00:00:00.000Z',
      timeFrom: '2026-11-20T14:00:00.000Z',
      timeTo: '2026-11-20T17:00:00.000Z',
      recurrenceFrequency: 2,
      recurrenceInterval: 1,
      daysOfWeek: [5],
      totalSessions: 2,
      excludeReservationId: testId
    });
    console.log('Conflict WITH exclude status:', conflictWithExclude.status, JSON.stringify(conflictWithExclude.body, null, 2));

    console.log('\n--- Step 4: Test PUT update to 14:00 - 17:00 ---');
    const updateRes = await apiCall(`/api/Reservations/${testId}`, 'PUT', token, {
      roomId: workhiveId,
      activity: 'TEST-Recurring-Conflict-Check',
      dateFrom: '2026-11-20T00:00:00.000Z',
      dateTo: '2026-11-27T00:00:00.000Z',
      timeFrom: '2026-11-20T14:00:00.000Z',
      timeTo: '2026-11-20T17:00:00.000Z',
      recurrenceFrequency: 2,
      recurrenceInterval: 1,
      daysOfWeek: [5],
      totalSessions: 2,
      reservationCost: 180,
      isOngoing: false
    });
    console.log('Update recurring PUT status:', updateRes.status, JSON.stringify(updateRes.body, null, 2));

  } finally {
    console.log('\n--- Step 5: Clean up ---');
    await apiCall(`/api/Reservations/${testId}`, 'DELETE', token);
  }
}

run().catch(console.error);
