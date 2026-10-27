import fs from 'fs';
import path from 'path';

const spec = JSON.parse(fs.readFileSync('live_openapi.json', 'utf8'));
const specPaths = Object.keys(spec.paths);

// Normalize spec paths: lowercase and normalize parameter names to {param}
function normalizePath(p) {
  return p.toLowerCase().replace(/\{[^}]+\}/g, '{}');
}

const normalizedSpecMap = new Map();
for (const p of specPaths) {
  normalizedSpecMap.set(normalizePath(p), p);
}

// Find all ts files in src/app
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walk('src/app');

// Also scan api-endpoints.ts
const endpointDefs = [];
const apiEndpointsContent = fs.readFileSync('src/app/core/constants/api-endpoints.ts', 'utf8');

// Match string literals and template literals starting with /api/
const pathRegex = /['"`](\/api\/[^'"`\n]+)['"`]/g;
let m;
while ((m = pathRegex.exec(apiEndpointsContent)) !== null) {
  let raw = m[1];
  // Replace ${...} with {}
  let norm = raw.toLowerCase().replace(/\$\{[^}]+\}/g, '{}');
  // Also remove query string
  norm = norm.split('?')[0];
  const matchedSpec = normalizedSpecMap.get(norm);
  endpointDefs.push({
    raw,
    normalized: norm,
    matchedSpec,
    status: matchedSpec ? 'OK' : 'NOT IN SPEC'
  });
}

console.log('--- API_ENDPOINTS.ts Check ---');
const notInSpec = endpointDefs.filter(e => e.status === 'NOT IN SPEC');
if (notInSpec.length > 0) {
  console.log('Not in spec in api-endpoints.ts:', notInSpec);
} else {
  console.log(`All ${endpointDefs.length} endpoint patterns in api-endpoints.ts matched OpenAPI spec!`);
}

// Now search for all direct http calls or API calls across all services
console.log('\n--- Direct HTTP calls and API calls in src/app ---');
const httpCalls = [];
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  // Find this.get, this.post, this.put, this.delete, http.get, http.post, etc.
  // or strings matching /api/
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('/api/')) {
      // Find what /api/... path is on this line
      const lineMatch = line.match(/['"`](\/api\/[^'"`\n]+)['"`]/);
      if (lineMatch) {
        let raw = lineMatch[1];
        let norm = raw.toLowerCase()
          .replace(/\$\{[^}]+\}/g, '{}')
          .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '{}')
          .split('?')[0];
        const matched = normalizedSpecMap.get(norm);
        httpCalls.push({
          file: f,
          line: idx + 1,
          raw,
          matched,
          status: matched ? 'OK' : 'NOT IN SPEC'
        });
      }
    }
  });
}

const notInSpecHttp = httpCalls.filter(h => h.status === 'NOT IN SPEC');
console.log(`Total /api/ string occurrences across codebase: ${httpCalls.length}`);
console.log(`Not in spec occurrences: ${notInSpecHttp.length}`);
if (notInSpecHttp.length > 0) {
  console.log(notInSpecHttp);
}
