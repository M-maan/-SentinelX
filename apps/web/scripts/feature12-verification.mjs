import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const webRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(webRoot, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(webRoot, relativePath), 'utf8');
}

function check(name, assertion) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

const polling = read('lib/query-config.ts');
const dashboard = read('app/dashboard/page.tsx');
const devices = read('app/dashboard/devices/page.tsx');
const detail = read('app/dashboard/devices/[id]/page.tsx');
const telemetryHistory = read('lib/telemetry-history.ts');
const devicesApi = read('lib/devices.api.ts');
const monitoringApi = read('lib/monitoring.api.ts');
const migration = fs.readFileSync(
  path.join(repoRoot, 'apps', 'api', 'src', 'database', 'migrations', '1720000003000-MonitoringIndexes.ts'),
  'utf8',
);

check('60-second polling policy is explicit', () => {
  assert.match(polling, /MONITORING_POLL_INTERVAL_MS\s*=\s*60_000/);
  assert.match(polling, /refetchIntervalInBackground:\s*false/);
  assert.match(polling, /retry:\s*false/);
});

check('monitoring queries use the shared polling policy', () => {
  assert.match(dashboard, /monitoringPolling/);
  assert.match(devices, /monitoringPolling/);
  assert.match(detail, /monitoringPolling/);
});

check('background refresh stops polling after an error', () => {
  assert.match(polling, /query\.state\.error\s*\?\s*false\s*:\s*MONITORING_POLL_INTERVAL_MS/);
});

check('no uncontrolled timer or streaming transport was introduced', () => {
  const monitoredSources = `${polling}\n${dashboard}\n${devices}\n${detail}\n${devicesApi}\n${monitoringApi}`;
  assert.doesNotMatch(monitoredSources, /setInterval|WebSocket|socket\.io|socketio/i);
});

check('frontend API clients do not accept a client-selected organization scope', () => {
  assert.match(devicesApi, /list:\(token:string, filters:DeviceListFilters=\{\}\)/);
  assert.doesNotMatch(devicesApi, /organizationId\s*=/);
  assert.doesNotMatch(devicesApi, /[?&]organizationId/);
});

check('telemetry mapping rejects invalid timestamps and preserves chronological order', () => {
  assert.match(telemetryHistory, /filter\(/);
  assert.match(telemetryHistory, /isNaN|Invalid Date/);
  assert.match(telemetryHistory, /reverse\(\)/);
});

check('monitoring indexes remain defined in the expected migration', () => {
  assert.match(migration, /IDX_agents_credential_hash/);
  assert.match(migration, /IDX_agents_organization_last_seen/);
  assert.match(migration, /IDX_agent_telemetry_agent_recorded_at/);
});

check('verification script is read-only', () => {
  assert.equal(fs.existsSync(path.join(webRoot, '.env')), false, 'frontend .env must not be created');
});
