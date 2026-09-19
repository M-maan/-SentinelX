const base = process.env.WEB_URL ?? 'http://localhost:3000';
const checks = [['/login', 'Welcome back'], ['/register', 'Create your workspace'], ['/dashboard', null], ['/dashboard/devices', null], ['/dashboard/devices/demo', null]];
for (const [path, marker] of checks) { const response = await fetch(`${base}${path}`); const html = await response.text(); if (!response.ok) throw new Error(`${path} returned ${response.status}`); if (marker && !html.includes(marker)) throw new Error(`${path} did not contain expected marker: ${marker}`); console.log(`PASS ${path} ${response.status}`); }
