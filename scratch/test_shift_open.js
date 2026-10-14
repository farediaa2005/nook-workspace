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

  console.log('Testing open shift check for userId:', userId);
  const openRes = await apiCall(`/api/Shifts/open/${userId}`, 'GET', token);
  console.log('Open shift check status:', openRes.status, JSON.stringify(openRes.body, null, 2));
}

run().catch(console.error);
