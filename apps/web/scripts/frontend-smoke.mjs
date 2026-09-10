const base = process.env.WEB_URL ?? 'http://localhost:3000';
for (const path of ['/login', '/register', '/dashboard']) { const response = await fetch(`${base}${path}`); if (!response.ok) throw new Error(`${path} returned ${response.status}`); console.log(`PASS ${path} ${response.status}`); }
