const https = require('https');

function postJson(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request('https://nook.runasp.net' + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
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
    req.write(data);
    req.end();
  });
}

async function test() {
  console.log('Logging in to live API...');
  const res = await postJson('/api/Auth/login', {
    identifier: 'admin',
    password: 'Admin@123'
  });
  console.log('Status:', res.status);
  console.log('Success:', res.body?.success);
  const token = res.body?.data?.accessToken || res.body?.accessToken;
  console.log('Got token:', !!token);
  return token;
}

test().catch(console.error);
