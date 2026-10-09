'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { DashboardSummary, monitoringApi } from '../../lib/monitoring.api';
import { devicesApi } from '../../lib/devices.api';
import { useAuthStore } from '../../lib/auth-store';
import { EmptyState, ErrorState, LoadingSkeleton, MetricCard, PageHeader, RefreshButton, SectionCard } from '../../components/monitoring-ui';
import { OsDistributionChart, StatusDistributionChart } from '../../components/dashboard-charts';

const emptySummary: DashboardSummary = { totalDevices: 0, onlineDevices: 0, offlineDevices: 0, osDistribution: [], agentVersions: [] };

export default function Dashboard() {
  const { accessToken, user } = useAuthStore(); const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const summary = useQuery({ queryKey: ['dashboard-summary'], queryFn: () => monitoringApi.summary(accessToken!), enabled: Boolean(accessToken), placeholderData: keepPreviousData, retry: false });
  const devices = useQuery({ queryKey: ['dashboard-devices'], queryFn: () => devicesApi.list(accessToken!, { page: 1, limit: 100 }), enabled: Boolean(accessToken), placeholderData: keepPreviousData, retry: false });
  useEffect(() => { if (!selectedDeviceId && devices.data?.items[0]) setSelectedDeviceId(devices.data.items[0].id); }, [devices.data, selectedDeviceId]);
  const detail = useQuery({ queryKey: ['dashboard-device-detail', selectedDeviceId], queryFn: () => devicesApi.detail(accessToken!, selectedDeviceId), enabled: Boolean(accessToken && selectedDeviceId), placeholderData: keepPreviousData, retry: false });
  const refresh = () => { void Promise.all([summary.refetch(), devices.refetch(), detail.refetch()]); };
  if (!user || !accessToken) return null;
  if (summary.isPending && !summary.data) return <div className="console-page"><PageHeader title="Monitoring dashboard" description="Loading your authorized endpoint summary." /><LoadingSkeleton rows={6} /></div>;
  if (summary.isError && !summary.data) return <div className="console-page"><PageHeader title="Monitoring dashboard" description="Your endpoint visibility summary." /><ErrorState message={summary.error instanceof Error ? summary.error.message : 'Unable to load dashboard summary.'} onRetry={refresh} /></div>;
  const data = summary.data ?? emptySummary; const telemetry = detail.data?.latestTelemetry?.[0]; const refreshing = summary.isFetching || devices.isFetching || detail.isFetching;
  return <div className="console-page"><PageHeader title="Monitoring dashboard" description={`Live endpoint visibility for ${user.organization?.name ?? 'your organization'}.`} action={<RefreshButton onClick={refresh} busy={refreshing} />} />
    <div className="metric-grid dashboard-metrics"><MetricCard label="Total devices" value={data.totalDevices} detail="Enrolled endpoints" /><MetricCard label="Online devices" value={data.onlineDevices} detail="Within heartbeat threshold" /><MetricCard label="Offline devices" value={data.offlineDevices} detail="Stale or missing heartbeat" /><MetricCard label="Operating systems" value={data.osDistribution.length} detail="Distinct reported categories" /></div>
    {data.totalDevices === 0 && <EmptyState title="No devices enrolled yet" description="Enroll an endpoint to start seeing real monitoring data in this workspace." />}
    <div className="dashboard-grid"><SectionCard title="Device status"><StatusDistributionChart online={data.onlineDevices} offline={data.offlineDevices} /></SectionCard><SectionCard title="Operating systems"><OsDistributionChart data={data.osDistribution} /></SectionCard></div>
    <div className="dashboard-grid"><SectionCard title="Agent versions"><div className="version-list">{data.agentVersions.length === 0 ? <p className="muted">No agent version data available.</p> : data.agentVersions.map(item => <div className="version-row" key={item.version}><span>{item.version}</span><strong>{item.count}</strong></div>)}</div></SectionCard><SectionCard title="Latest telemetry"><div className="telemetry-controls"><label htmlFor="telemetry-device">Device</label><select id="telemetry-device" value={selectedDeviceId} onChange={event => setSelectedDeviceId(event.target.value)}><option value="">Select a device</option>{devices.data?.items.map(device => <option value={device.id} key={device.id}>{device.hostname} · {device.agentId}</option>)}</select></div>{devices.isError ? <ErrorState message="Unable to load enrolled devices." onRetry={() => void devices.refetch()} /> : !selectedDeviceId ? <EmptyState title="Select an enrolled device" description="Telemetry is shown for one authorized device at a time." /> : detail.isPending && !detail.data ? <LoadingSkeleton rows={2} /> : detail.isError ? <ErrorState message="Unable to load selected device telemetry." onRetry={() => void detail.refetch()} /> : telemetry ? <div className="telemetry-cards"><MetricCard label="CPU usage" value={`${telemetry.cpuUsage}%`} /><MetricCard label="Memory usage" value={telemetry.memoryUsage == null ? '—' : `${telemetry.memoryUsage}%`} /><MetricCard label="Disk usage" value={telemetry.diskUsage == null ? '—' : `${telemetry.diskUsage}%`} /><MetricCard label="Uptime" value={`${telemetry.uptimeSeconds}s`} /></div> : <EmptyState title="No telemetry received" description="The selected device has not reported telemetry yet." />}{telemetry && <p className="telemetry-timestamp">Recorded {new Date(telemetry.recordedAt).toLocaleString()}</p>}</SectionCard></div>
  </div>;
}
