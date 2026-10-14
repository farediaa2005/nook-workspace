const https = require('https');
const fs = require('fs');

https.get('https://nook.runasp.net/swagger/index.html', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Swagger HTML Status:', res.statusCode);
    const match = data.match(/url\s*:\s*["']([^"']+)["']/i);
    const jsonUrl = match ? match[1] : null;
    console.log('Swagger spec URL found in HTML:', jsonUrl);
    if (jsonUrl) {
      const fullUrl = jsonUrl.startsWith('http') ? jsonUrl : 'https://nook.runasp.net' + jsonUrl;
      console.log('Fetching live spec from:', fullUrl);
      https.get(fullUrl, (specRes) => {
        let specData = '';
        specRes.on('data', c => specData += c);
        specRes.on('end', () => {
          console.log('Live spec status:', specRes.statusCode, 'size:', specData.length);
          if (specRes.statusCode === 200 && specData.length > 1000) {
            fs.writeFileSync('swagger_live.json', specData);
            console.log('Saved swagger_live.json');
          }
        });
      });
    }
  });
}).on('error', err => console.log('Network error:', err.message));
