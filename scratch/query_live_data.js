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
  if (!token) {
    console.error('Failed to get token:', loginRes);
    return;
  }
  console.log('Logged in successfully!');

  // 1. Rooms
  const roomsRes = await apiCall('/api/Rooms', 'GET', token);
  const rooms = roomsRes.body?.data || roomsRes.body || [];
  console.log('\n--- ROOMS (' + rooms.length + ') ---');
  rooms.forEach(r => {
    console.log(`Room: id=${r.id}, name="${r.name}", supportsWorkspace=${r.supportsWorkspace}, supportsClassroom=${r.supportsClassroom}, zone=${r.workspaceZone}`);
  });

  // 2. PricingPlans
  const plansRes = await apiCall('/api/PricingPlans', 'GET', token);
  const plans = plansRes.body?.data || plansRes.body || [];
  console.log('\n--- PRICING PLANS (' + plans.length + ') ---');
  plans.forEach(p => {
    console.log(`Plan: id=${p.id}, roomId=${p.roomId}, roomName="${p.roomName}", scope=${p.scope}, baseHours=${p.baseHours}, baseCost=${p.baseCost}, overage=${p.overageHourlyRate}, active=${p.isActive}`);
  });

  // 3. Test Pricing Suggestion for Workhive if available
  const workhive = rooms.find(r => (r.name || '').includes('Workhive'));
  if (workhive) {
    console.log('\n--- Testing Pricing Suggestion for Workhive ---');
    for (const scope of [1, 2, 3]) {
      const sugg = await apiCall(`/api/PricingPlans/suggestion?roomId=${workhive.id}&scope=${scope}&hours=2`, 'GET', token);
      console.log(`Scope ${scope} 2h suggestion:`, sugg.status, sugg.body);
    }
  }

  // 4. Reservations
  const resRes = await apiCall('/api/Reservations', 'GET', token);
  const reservations = resRes.body?.data || resRes.body || [];
  console.log('\n--- RESERVATIONS (' + reservations.length + ') ---');
  reservations.slice(0, 5).forEach(r => {
    console.log(`Reservation: id=${r.id}, room="${r.roomName}", instructor="${r.instructorName}", status=${r.status}, freq=${r.recurrenceFrequency}, dateFrom=${r.dateFrom}`);
  });

  // 5. Shifts
  const shiftsRes = await apiCall('/api/Shifts', 'GET', token);
  const shifts = shiftsRes.body?.data || shiftsRes.body || [];
  console.log('\n--- SHIFTS (' + shifts.length + ') ---');
  shifts.slice(0, 3).forEach(s => {
    console.log(`Shift: id=${s.id}, date=${s.date}, previousTotal=${s.previousTotal}, vfStart=${s.startVodafoneCash}, ipStart=${s.startInstapay}, fawryStart=${s.startFawry}, status=${s.status}, expectedCash=${s.expectedCash}, cashDiff=${s.cashDifference}`);
  });

  // 6. Current Shift
  const currShiftRes = await apiCall('/api/Shifts/current', 'GET', token);
  console.log('\n--- CURRENT SHIFT ---', currShiftRes.status, currShiftRes.body);

  // 7. Faculties
  const facultiesRes = await apiCall('/api/Faculties', 'GET', token);
  const faculties = facultiesRes.body?.data || facultiesRes.body || [];
  console.log('\n--- FACULTIES (' + faculties.length + ') ---');
  faculties.slice(0, 5).forEach(f => {
    console.log(`Faculty: id=${f.id}, name="${f.name || f.facultyName || f.title}"`);
  });

  // 8. Coupons
  const couponsRes = await apiCall('/api/Coupons', 'GET', token);
  const coupons = couponsRes.body?.data || couponsRes.body || [];
  console.log('\n--- COUPONS (' + coupons.length + ') ---');
  coupons.slice(0, 5).forEach(c => {
    console.log(`Coupon: id=${c.id}, code="${c.code}", discountType=${c.discountType}, value=${c.value}, active=${c.isActive}`);
  });
}

run().catch(console.error);
