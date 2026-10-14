const https = require('https');

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    https.get('https://nook.runasp.net' + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('--- 1. Fetching Rooms ---');
  const rooms = await fetchJson('/api/Rooms');
  console.log('Rooms status:', rooms.status);
  const roomsList = rooms.body?.data || rooms.body || [];
  console.log('Total rooms:', roomsList.length);
  if (Array.isArray(roomsList)) {
    roomsList.forEach(r => {
      console.log(`Room: id=${r.id}, name=${r.name}, supportsWorkspace=${r.supportsWorkspace}, supportsClassroom=${r.supportsClassroom}, zone=${r.workspaceZone}`);
    });
  }

  console.log('\n--- 2. Fetching PricingPlans ---');
  const plans = await fetchJson('/api/PricingPlans');
  console.log('PricingPlans status:', plans.status);
  const plansList = plans.body?.data || plans.body || [];
  console.log('Total plans:', plansList.length);
  if (Array.isArray(plansList)) {
    plansList.forEach(p => {
      console.log(`Plan: id=${p.id}, roomId=${p.roomId}, roomName=${p.roomName}, scope=${p.scope}, baseHours=${p.baseHours}, baseCost=${p.baseCost}, overage=${p.overageHourlyRate}, active=${p.isActive}`);
    });
  }

  console.log('\n--- 3. Fetching Faculties ---');
  const faculties = await fetchJson('/api/Faculties');
  console.log('Faculties status:', faculties.status);
  const facultiesList = faculties.body?.data || faculties.body || [];
  console.log('Total faculties:', facultiesList.length);
  if (Array.isArray(facultiesList)) {
    facultiesList.slice(0, 5).forEach(f => {
      console.log(`Faculty: id=${f.id}, name=${f.name || f.facultyName || f.title}`);
    });
  }

  console.log('\n--- 4. Fetching Discounts/rules ---');
  const rules = await fetchJson('/api/Discounts/rules');
  console.log('Discount rules status:', rules.status);
  console.log('Rules:', JSON.stringify(rules.body).slice(0, 300));
}

run().catch(console.error);
