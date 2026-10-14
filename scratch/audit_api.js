const fs = require('fs');
const path = require('path');

const openapi = JSON.parse(fs.readFileSync('live_openapi.json', 'utf8'));
const openapiPaths = Object.keys(openapi.paths);

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (file.endsWith('.ts')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const files = walkDir('src/app');

// Also check api-endpoints.ts specifically
const endpointDefinitions = [];
if (fs.existsSync('src/app/core/constants/api-endpoints.ts')) {
  const epContent = fs.readFileSync('src/app/core/constants/api-endpoints.ts', 'utf8');
  const epLines = epContent.split('\n');
  epLines.forEach((l, idx) => {
    const m = l.match(/['"`](\/api\/[^'"`]+)['"`]/);
    if (m) {
      endpointDefinitions.push({ line: idx + 1, path: m[1] });
    }
  });
}

const calls = [];
const urlRegex = /['"`](\/api\/[^'"`]+)['"`]/g;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let match;
  while ((match = urlRegex.exec(content)) !== null) {
    calls.push({ file: f, raw: match[1] });
  }
});

console.log('Total /api/ occurrences:', calls.length);
console.log('Total endpoints defined in api-endpoints.ts:', endpointDefinitions.length);

const results = [];
const seen = new Set();

calls.forEach(c => {
  const key = c.raw;
  if (seen.has(key)) return;
  seen.add(key);

  // normalize ${...}
  let norm = key.replace(/\$\{[^}]+\}/g, '{param}');
  norm = norm.replace(/\/[0-9a-fA-F-]{36}(\/|$)/g, '/{id}$1'); // replace guids

  // Find match in openapi
  let matchedPath = null;
  for (const p of openapiPaths) {
    // replace {param} with regex
    const pRegexStr = '^' + p.replace(/\{[^}]+\}/g, '[^/]+') + '(\\?.*)?$';
    const pRegex = new RegExp(pRegexStr);
    if (pRegex.test(norm) || p === norm || norm.startsWith(p)) {
      matchedPath = p;
      break;
    }
  }

  results.push({
    raw: key,
    file: c.file,
    normalized: norm,
    matchedPath,
    status: matchedPath ? 'OK' : 'NOT IN SPEC'
  });
});

const notInSpec = results.filter(r => r.status === 'NOT IN SPEC');
console.log('NOT IN SPEC count:', notInSpec.length);
console.log(JSON.stringify(notInSpec, null, 2));

fs.writeFileSync('scratch/audit_results.json', JSON.stringify({ openapiPathsCount: openapiPaths.length, results }, null, 2));
