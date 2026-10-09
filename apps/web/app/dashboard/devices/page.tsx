'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DeviceStatusBadge, EmptyState, ErrorState, LoadingSkeleton, PageHeader, RefreshButton, ResponsiveTableContainer, SectionCard } from '../../../components/monitoring-ui';
import { useAuthStore } from '../../../lib/auth-store';
import { devicesApi } from '../../../lib/devices.api';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const SORT_OPTIONS = [
  { value: 'lastSeen', label: 'Last seen' },
  { value: 'hostname', label: 'Hostname' },
  { value: 'status', label: 'Status' },
  { value: 'recentlyActive', label: 'Recently active' },
] as const;

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Never reported';
const displayValue = (value: string | null | undefined, fallback = 'Not reported') => value || fallback;

export default function DevicesPage() {
  const { accessToken, user } = useAuthStore();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ONLINE' | 'OFFLINE' | ''>('');
  const [os, setOs] = useState('');
  const [agentVersion, setAgentVersion] = useState('');
  const [hostname, setHostname] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['value']>('lastSeen');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [token, setToken] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => setPage(1), [search]);

  const filters = useMemo(() => ({ page, limit, search, status: status || undefined, os: os.trim() || undefined, agentVersion: agentVersion.trim() || undefined, hostname: hostname.trim() || undefined, sortBy, sortOrder }), [page, limit, search, status, os, agentVersion, hostname, sortBy, sortOrder]);
  const devices = useQuery({ queryKey: ['devices', filters], queryFn: () => devicesApi.list(accessToken!, filters), enabled: Boolean(accessToken), placeholderData: keepPreviousData, retry: false });

  if (!user || !accessToken) return null;

  const result = devices.data;
  const clearFilters = () => { setSearchInput(''); setSearch(''); setStatus(''); setOs(''); setAgentVersion(''); setHostname(''); setPage(1); };
  const hasFilters = Boolean(searchInput || search || status || os || agentVersion || hostname);
  const changeLimit = (value: string) => { setLimit(Number(value)); setPage(1); };
  const changeSort = (value: string) => { setSortBy(value as (typeof SORT_OPTIONS)[number]['value']); setPage(1); };
  const toggleSortOrder = () => { setSortOrder(current => current === 'asc' ? 'desc' : 'asc'); setPage(1); };
  const generateToken = async () => { setActionError(''); try { const response = await devicesApi.enrollmentToken(accessToken); setToken(`${response.token} (expires ${new Date(response.expiresAt).toLocaleTimeString()})`); } catch (error) { setActionError(error instanceof Error ? error.message : 'Unable to generate enrollment token.'); } };
  const revokeToken = async () => { setActionError(''); try { await devicesApi.revokeEnrollmentToken(accessToken); setToken(''); } catch (error) { setActionError(error instanceof Error ? error.message : 'Unable to revoke enrollment token.'); } };

  return <div className="console-page">
    <PageHeader title="Devices" description="Review enrolled endpoints in your authorized organization scope." action={<RefreshButton onClick={() => void devices.refetch()} busy={devices.isFetching} />} />
    {(user.role === 'SECURITY_ADMIN' || user.role === 'SUPER_ADMIN') && <SectionCard title="Enrollment access"><p className="muted">Generate a short-lived enrollment token for a local agent setup.</p><div className="action-row"><button className="button" type="button" onClick={() => void generateToken()}>Generate token</button><button className="button secondary" type="button" onClick={() => void revokeToken()}>Revoke token</button></div>{token && <p className="token-notice">Token generated locally. Share it only with the agent setup.</p>}{actionError && <p className="error" role="alert">{actionError}</p>}</SectionCard>}
    <SectionCard title="Device inventory">
      <div className="device-filter-grid" aria-label="Device search and filters">
        <label className="filter-field"><span>Search hostname</span><input value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Search hostname" aria-label="Search hostname" />{searchInput && <button type="button" className="input-clear" onClick={() => setSearchInput('')} aria-label="Clear hostname search">Clear</button>}</label>
        <label className="filter-field"><span>Status</span><select value={status} onChange={event => { setStatus(event.target.value as 'ONLINE' | 'OFFLINE' | ''); setPage(1); }} aria-label="Filter by status"><option value="">All statuses</option><option value="ONLINE">Online</option><option value="OFFLINE">Offline</option></select></label>
        <label className="filter-field"><span>Operating system</span><input value={os} onChange={event => { setOs(event.target.value); setPage(1); }} placeholder="Exact OS value" aria-label="Filter by operating system" /></label>
        <label className="filter-field"><span>Agent version</span><input value={agentVersion} onChange={event => { setAgentVersion(event.target.value); setPage(1); }} placeholder="Exact version" aria-label="Filter by agent version" /></label>
        <label className="filter-field"><span>Hostname filter</span><input value={hostname} onChange={event => { setHostname(event.target.value); setPage(1); }} placeholder="Exact hostname" aria-label="Filter by hostname" /></label>
        <button type="button" className="button secondary filter-clear" onClick={clearFilters} disabled={!hasFilters}>Clear filters</button>
      </div>
      <div className="device-list-toolbar"><div className="sort-controls"><label htmlFor="device-sort">Sort by</label><select id="device-sort" value={sortBy} onChange={event => changeSort(event.target.value)}>{SORT_OPTIONS.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select><button type="button" className="button secondary compact-button" onClick={toggleSortOrder} aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}>{sortOrder === 'asc' ? 'Ascending ↑' : 'Descending ↓'}</button></div>{result && <span className="muted">{result.total} matching device{result.total === 1 ? '' : 's'}</span>}</div>
      {devices.isError ? <ErrorState message="Unable to load devices. Your session or organization access may have changed." onRetry={() => void devices.refetch()} /> : devices.isPending && !result ? <LoadingSkeleton rows={6} /> : result && result.items.length === 0 ? <EmptyState title={hasFilters ? 'No matching devices' : 'No devices enrolled'} description={hasFilters ? 'Try clearing a filter or changing the search criteria.' : 'Enrolled devices in your organization will appear here.'} action={hasFilters ? <button type="button" className="button secondary" onClick={clearFilters}>Clear filters</button> : undefined} /> : result && <>
        <ResponsiveTableContainer><table className="device-table"><caption className="sr-only">Enrolled devices</caption><thead><tr><th scope="col">Hostname</th><th scope="col">Operating system</th><th scope="col">IP address</th><th scope="col">Agent version</th><th scope="col">Status</th><th scope="col">Last seen</th></tr></thead><tbody>{result.items.map(device => <tr key={device.id}><td><Link className="device-name-link" href={`/dashboard/devices/${device.id}`}>{device.hostname}</Link><small className="muted">Agent {device.agentId}</small></td><td>{displayValue(device.operatingSystem)}{device.osVersion && <small className="muted">{device.osVersion}</small>}</td><td>{displayValue(device.ipAddress)}</td><td>{displayValue(device.agentVersion)}</td><td><DeviceStatusBadge status={device.status} /></td><td>{formatDate(device.lastSeen)}</td></tr>)}</tbody></table></ResponsiveTableContainer>
        <div className="device-pagination"><label htmlFor="device-page-size">Rows per page</label><select id="device-page-size" value={limit} onChange={event => changeLimit(event.target.value)}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select><span className="muted">Page {result.page} of {result.totalPages || 1}</span><button type="button" className="button secondary compact-button" disabled={result.page <= 1 || devices.isFetching} onClick={() => setPage(current => Math.max(1, current - 1))}>Previous</button><button type="button" className="button secondary compact-button" disabled={result.totalPages === 0 || result.page >= result.totalPages || devices.isFetching} onClick={() => setPage(current => current + 1)}>Next</button></div>
      </>}
      {devices.isFetching && result && <p className="background-refresh" role="status">Updating device inventory…</p>}
    </SectionCard>
  </div>;
}
