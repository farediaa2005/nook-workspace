// Prints the CSS rules of a file whose selector contains a class, with line numbers.
// Usage: node audit/scripts/css-rules.mjs <file.css> <.class> [<file.css> <.class> …]
import fs from 'node:fs';
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const [f, cls] = [args[i], args[i + 1]];
  const s = fs.readFileSync(f, 'utf8');
  console.log(`=== ${f} ${cls}`);
  for (const m of s.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!sel.split(',').some((p) => p.includes(cls))) continue;
    const line = s.slice(0, m.index + m[1].length).split('\n').length;
    console.log(`${line}: ${sel.replace(/\s+/g, ' ')} { ${m[2].replace(/\s+/g, ' ').trim()} }`);
  }
}
