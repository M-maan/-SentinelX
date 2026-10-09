'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DeviceStatusBadge, EmptyState, ErrorState, LoadingSkeleton, PageHeader, RefreshButton, SectionCard } from '../../../components/monitoring-ui';
import { useAuthStore } from '../../../lib/auth-store';
import { Device, devicesApi } from '../../../lib/devices.api';

export default function DevicesPage() {
  const { accessToken, user } = useAuthStore();
  const [items, setItems] = useState<Device[]>([]); const [error, setError] = useState(''); const [token, setToken] = useState(''); const [loading, setLoading] = useState(true); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [os, setOs] = useState(''); const limit = 10;
  const load = () => { if (!accessToken) return; setLoading(true); setError(''); devicesApi.list(accessToken, { page, limit, search, status, os }).then(result => { setItems(result.items); setTotal(result.total); }).catch(value => setError(value instanceof Error ? value.message : 'Unable to load devices')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [accessToken, page, status, os]);
  if (!user || !accessToken) return null;
  const applyFilters = () => { if (page !== 1) setPage(1); else load(); };
  return <div className="console-page">
    <PageHeader title="Devices" description="Review enrolled endpoints in your authorized organization scope." action={<RefreshButton onClick={load} busy={loading} />} />
    {error && <ErrorState message={error} onRetry={load} />}
    {(user.role === 'SECURITY_ADMIN' || user.role === 'SUPER_ADMIN') && <SectionCard title="Enrollment access"><p className="muted">Generate a short-lived enrollment token for a local agent setup.</p><div className="action-row"><button className="button" onClick={() => devicesApi.enrollmentToken(accessToken).then(result => setToken(`${result.token} (expires ${new Date(result.expiresAt).toLocaleTimeString()})`)).catch(value => setError(value.message))}>Generate token</button><button className="button secondary" onClick={() => devicesApi.revokeEnrollmentToken(accessToken).then(() => setToken('')).catch(value => setError(value.message))}>Revoke token</button></div>{token && <p className="token-notice">Token generated locally. Share it only with the agent setup.</p>}</SectionCard>}
    <SectionCard title="Registered devices"><div className="filters"><label><span className="sr-only">Hostname search</span><input placeholder="Search hostname" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => event.key === 'Enter' && applyFilters()} /></label><label><span className="sr-only">Status filter</span><select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option>ONLINE</option><option>OFFLINE</option></select></label><label><span className="sr-only">Operating system filter</span><input placeholder="Operating system" value={os} onChange={event => setOs(event.target.value)} onKeyDown={event => event.key === 'Enter' && applyFilters()} /></label><button className="button" onClick={applyFilters}>Apply</button></div>{loading ? <LoadingSkeleton /> : items.length === 0 ? <EmptyState title="No devices found" description="Enrolled devices matching the current filters will appear here." /> : <div className="device-list">{items.map(device => <Link className="device-row" href={`/dashboard/devices/${device.id}`} key={device.id}><span><strong>{device.hostname}</strong><br /><small className="muted">{device.operatingSystem} · {device.agentVersion} · {device.agentId}</small></span><DeviceStatusBadge status={device.status} /></Link>)}</div>}<div className="pager"><button className="button secondary compact-button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span className="muted">Page {page} · {total} total</span><button className="button secondary compact-button" disabled={page * limit >= total} onClick={() => setPage(page + 1)}>Next</button></div></SectionCard>
  </div>;
}
