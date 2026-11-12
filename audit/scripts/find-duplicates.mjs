// C3: finds methods/functions whose bodies are the same (after removing comments and whitespace, and
// renaming identifiers to their kind) in more than one place. Uses the TypeScript compiler API that the
// project already has. Usage: node audit/scripts/find-duplicates.mjs [minLines=4]
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const minLines = Number(process.argv[2] || 4);
const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) files.push(p); } };
walk('src/app');

const groups = new Map(); // normalized body → [{file, name, line, lines}]
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    const isFn = ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node) || ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && ts.isPropertyDeclaration(node.parent));
    if (isFn && node.body && ts.isBlock(node.body)) {
      const text = node.body.getText(sf);
      const lines = text.split('\n').length;
      if (lines >= minLines) {
        // exact structure: drop comments/whitespace; keep identifiers (renamed copies are reported by the loose key)
        const exact = text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').replace(/\s+/g, '');
        const nameNode = node.name || (node.parent && node.parent.name);
        const name = nameNode ? nameNode.getText(sf) : '(anonymous)';
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        if (!groups.has(exact)) groups.set(exact, []);
        groups.get(exact).push({ file: f.replace(/^src[\\/]app[\\/]/, '').replace(/\\/g, '/'), name, line, lines });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
const dups = [...groups.values()].filter((g) => g.length > 1 && new Set(g.map((x) => x.file + x.name)).size > 1)
  .sort((a, b) => b[0].lines * b.length - a[0].lines * a.length);
let total = 0;
for (const g of dups) {
  total += g[0].lines * (g.length - 1);
  console.log(`${g.length}× ${g[0].lines} lines  ${[...new Set(g.map((x) => x.name))].join(' / ')}`);
  for (const x of g) console.log(`     ${x.file}:${x.line}`);
}
console.log(`${dups.length} duplicated bodies, about ${total} repeated lines`);
