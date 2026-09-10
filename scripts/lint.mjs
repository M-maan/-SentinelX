import fs from 'node:fs';
import path from 'node:path';

const roots = ['apps/api/src', 'apps/web/app', 'apps/web/components', 'apps/web/lib'];
const forbidden = /console\.(log|debug|info)|\bdebugger\b|\bTODO\b|\bFIXME\b/;
const failures = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(ts|tsx)$/.test(entry.name) && forbidden.test(fs.readFileSync(file, 'utf8'))) failures.push(file);
  }
}
for (const root of roots) walk(root);
if (failures.length) { console.error(`Static lint failed in: ${failures.join(', ')}`); process.exit(1); }
console.log(`Static lint passed (${roots.length} source roots checked)`);
