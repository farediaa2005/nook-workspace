// Rewrites changed files so that unchanged lines keep the exact bytes (incl. CR/LF)
// they have in HEAD; only lines that really changed are written. Keeps diffs minimal
// when a tool rewrote a whole file with different line endings.
// Usage (from the Frontend folder): node audit/scripts/keep-eol.mjs <file>...
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

for (const file of process.argv.slice(2)) {
  let head;
  try {
    head = execFileSync('git', ['show', `HEAD:./${file}`], { encoding: 'utf8', maxBuffer: 1e8 });
  } catch {
    continue; // new file
  }
  const headLines = head.split(/(?<=\n)/); // keep endings
  const work = fs.readFileSync(file, 'utf8');
  const workLines = work.split(/(?<=\n)/);
  const crlf = (head.match(/\r\n/g) || []).length > (head.match(/\n/g) || []).length / 2;
  const diff = execFileSync('git', ['diff', '-U0', '--ignore-cr-at-eol', 'HEAD', '--', file], { encoding: 'utf8', maxBuffer: 1e8 });
  const hunks = [...diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)].map((m) => ({
    oldStart: +m[1], oldLen: m[2] === undefined ? 1 : +m[2], newStart: +m[3], newLen: m[4] === undefined ? 1 : +m[4]
  }));
  const out = [];
  let oldIdx = 0; // 0-based next HEAD line to copy
  for (const h of hunks) {
    const oldFrom = h.oldLen === 0 ? h.oldStart : h.oldStart - 1; // insertion after line oldStart
    while (oldIdx < oldFrom) out.push(headLines[oldIdx++]);
    for (let i = 0; i < h.newLen; i++) {
      const line = workLines[h.newStart - 1 + i].replace(/\r?\n$/, '');
      const hadNl = /\n$/.test(workLines[h.newStart - 1 + i]);
      out.push(line + (hadNl ? (crlf ? '\r\n' : '\n') : ''));
    }
    oldIdx += h.oldLen;
  }
  while (oldIdx < headLines.length) out.push(headLines[oldIdx++]);
  fs.writeFileSync(file, out.join(''));
  console.log(`${file}: ${hunks.length} hunks`);
}
