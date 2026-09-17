'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../../../lib/auth-store';
import { devicesApi, type Device } from '../../../lib/devices.api';
import { createZip } from '../../../lib/zip';

const encoder = new TextEncoder();
const launcher = '@echo off\r\ncd /d "%~dp0"\r\necho SentinelX Agent is running. Keep this window open for live monitoring.\r\necho Close this window to stop the agent.\r\nsentinelx-agent.exe\r\necho.\r\necho The agent stopped. Check the error above, then try again.\r\npause\r\n';

export default function DevicesPage() {
  const { accessToken, user } = useAuthStore();
  const [items, setItems] = useState<Device[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [setupExpiresAt, setSetupExpiresAt] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [os, setOs] = useState('');
  const limit = 10;

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const result = await devicesApi.list(accessToken, { page, limit, search, status, os });
      setItems(result.items);
      setTotal(result.total);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load devices.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, search, status, os]);

  useEffect(() => { void load(); }, [accessToken, page, status, os]);
  useEffect(() => {
    if (!setupExpiresAt) return;
    const timer = window.setInterval(() => { void load(); }, 5000);
    return () => window.clearInterval(timer);
  }, [setupExpiresAt, load]);

  async function downloadWindowsSetup() {
    if (!accessToken) return;
    setDownloading(true);
    setError('');
    try {
      const binaryResponse = await fetch('/downloads/sentinelx-agent.exe', { cache: 'no-store' });
      if (!binaryResponse.ok) throw new Error('Windows agent download is unavailable.');
      const binary = new Uint8Array(await binaryResponse.arrayBuffer());
      const setup = await devicesApi.enrollmentToken(accessToken);
      const packageFile = createZip([
        { name: 'sentinelx-agent.exe', data: binary },
        { name: 'setup.json', data: encoder.encode(JSON.stringify({ apiUrl: setup.apiUrl, enrollmentToken: setup.token })) },
        { name: 'Start SentinelX Agent.cmd', data: encoder.encode(launcher) },
        { name: 'README.txt', data: encoder.encode('SentinelX Windows setup\r\n\r\n1. Extract all files from this ZIP into one folder.\r\n2. Double-click Start SentinelX Agent.cmd.\r\n3. Keep the window open for continuous monitoring.\r\n4. Return to Devices in SentinelX. Your device should appear automatically.\r\n\r\nThe enrollment setup expires in 30 minutes. Keep this ZIP private and delete it after enrollment.\r\n') },
      ]);
      const url = URL.createObjectURL(packageFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'SentinelX-Windows-Setup.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setSetupExpiresAt(setup.expiresAt);
      setSearch(''); setStatus(''); setOs(''); setPage(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not prepare the setup package.');
    } finally {
      setDownloading(false);
    }
  }

  async function revokeSetup() {
    if (!accessToken) return;
    try {
      await devicesApi.revokeEnrollmentToken(accessToken);
      setSetupExpiresAt('');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not revoke the setup.');
    }
  }

  if (!user || !accessToken) return <main className="auth"><section className="card"><h1>Session required</h1><Link href="/login">Sign in</Link></section></main>;

  return <div className="shell">
    <aside className="sidebar"><p className="brand">SENTINELX</p><nav><Link href="/dashboard">Dashboard</Link><Link href="/dashboard/organization">Organization</Link><Link href="/dashboard/users">Users</Link><span>Devices</span></nav></aside>
    <main className="main">
      <Link href="/dashboard">← Dashboard</Link><h1>Devices</h1>
      {error && <p className="error" role="alert">{error}</p>}
      {(user.role === 'SECURITY_ADMIN' || user.role === 'SUPER_ADMIN') && <section className="card device-setup">
        <h2>Register this Windows device</h2>
        <p>Download a ready-to-run agent package. No API calls, PowerShell commands, or Go installation needed.</p>
        <button className="button" type="button" disabled={downloading} onClick={downloadWindowsSetup}>{downloading ? 'Preparing package…' : 'Download Windows setup'}</button>
        <ol className="setup-steps"><li>Extract the downloaded ZIP into a folder.</li><li>Double-click <strong>Start SentinelX Agent.cmd</strong> and keep its window open.</li><li>This page will update when the device registers.</li></ol>
        {setupExpiresAt && <div className="setup-notice" role="status"><strong>Package ready.</strong> Start it before {new Date(setupExpiresAt).toLocaleTimeString()}. The setup token is inside the ZIP; keep it private. <button type="button" onClick={revokeSetup}>Revoke package</button></div>}
      </section>}
      <section className="card"><h2>Registered devices</h2>
        <div className="filters"><input aria-label="Search hostname or agent ID" placeholder="Search hostname or agent ID" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => event.key === 'Enter' && (setPage(1), void load())}/><select aria-label="Status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option>ONLINE</option><option>OFFLINE</option></select><input aria-label="Operating system" placeholder="OS (linux/windows)" value={os} onChange={event => setOs(event.target.value)} onKeyDown={event => event.key === 'Enter' && (setPage(1), void load())}/><button className="button" type="button" onClick={() => { setPage(1); void load(); }}>Apply</button></div>
        {loading ? <p>Loading…</p> : items.length === 0 ? <p>{search || status || os ? 'No devices match the current filters.' : 'No devices registered yet. Download the Windows setup above to add this PC.'}</p> : <div className="device-list">{items.map(device => <Link className="device-row" href={`/dashboard/devices/${device.id}`} key={device.id}><span><strong>{device.hostname}</strong><br/><small>{device.operatingSystem} · {device.agentVersion} · {device.agentId}</small></span><span className={device.status === 'ONLINE' ? 'online' : 'offline'}>{device.status}</span></Link>)}</div>}
        <div className="pager"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} · {total} total</span><button disabled={page * limit >= total} onClick={() => setPage(page + 1)}>Next</button></div>
      </section>
    </main>
  </div>;
}
