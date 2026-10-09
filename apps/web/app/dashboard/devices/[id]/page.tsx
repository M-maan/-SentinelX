'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DeviceStatusBadge, EmptyState, ErrorState, LoadingSkeleton, MetricCard, PageHeader, RefreshButton, SectionCard } from '../../../../components/monitoring-ui';
import { TelemetryHistoryCharts } from '../../../../components/telemetry-history-charts';
import { useAuthStore } from '../../../../lib/auth-store';
import { devicesApi } from '../../../../lib/devices.api';
import { displayDetailValue, formatBytes, formatDetailDate, formatDuration, formatPercent } from '../../../../lib/device-detail.format';
import { toChronologicalTelemetry } from '../../../../lib/telemetry-history';
import { monitoringPolling } from '../../../../lib/query-config';

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, user } = useAuthStore();
  const device = useQuery({ queryKey: ['device-detail', id], queryFn: () => devicesApi.detail(accessToken!, id), enabled: Boolean(accessToken && id), placeholderData: keepPreviousData, ...monitoringPolling });
  const telemetry = useQuery({ queryKey: ['device-telemetry', id, 50], queryFn: () => devicesApi.telemetry(accessToken!, id, { limit: 50 }), enabled: Boolean(accessToken && id), placeholderData: keepPreviousData, ...monitoringPolling });
  const record = device.data?.latestTelemetry?.[0];
  const retry = () => { void Promise.all([device.refetch(), telemetry.refetch()]); };
  const errorMessage = device.error instanceof Error && device.error.message.includes('session expired') ? device.error.message : 'Unable to load this device. It may not exist or may be outside your organization.';

  if (!user || !accessToken) return null;

  return <div className="console-page">
    <Link href="/dashboard/devices" className="back-link">← Back to Devices</Link>
    {device.isError && !device.data ? <ErrorState message={errorMessage} onRetry={retry} /> : device.isPending && !device.data ? <LoadingSkeleton rows={6} /> : device.data ? <>
      <PageHeader title={device.data.hostname} description={`${displayDetailValue(device.data.operatingSystem)} · Last seen ${formatDetailDate(device.data.lastSeen)}`} action={<div className="detail-header-actions"><DeviceStatusBadge status={device.data.status} /><RefreshButton onClick={retry} busy={device.isFetching} /></div>} />
      {device.isError && <p className="background-refresh refresh-warning" role="alert">Endpoint refresh failed; showing the last successful profile data.</p>}
      {device.isFetching && <p className="background-refresh" role="status">Refreshing endpoint information…</p>}
      <div className="detail-section-grid"><SectionCard title="Device information"><div className="detail-grid"><div><span className="muted">Hostname</span><strong>{device.data.hostname}</strong></div><div><span className="muted">Agent ID</span><strong>{device.data.agentId}</strong></div><div><span className="muted">Operating system</span><strong>{displayDetailValue(device.data.operatingSystem)}</strong></div><div><span className="muted">OS version</span><strong>{displayDetailValue(device.data.osVersion)}</strong></div><div><span className="muted">Architecture</span><strong>{displayDetailValue(device.data.architecture)}</strong></div><div><span className="muted">IP address</span><strong>{displayDetailValue(device.data.ipAddress)}</strong></div></div></SectionCard><SectionCard title="Agent information"><div className="detail-grid"><div><span className="muted">Agent version</span><strong>{displayDetailValue(device.data.agentVersion)}</strong></div><div><span className="muted">Current status</span><strong><DeviceStatusBadge status={device.data.status} /></strong></div><div><span className="muted">First seen</span><strong>{formatDetailDate(device.data.firstSeen)}</strong></div><div><span className="muted">Last seen</span><strong>{formatDetailDate(device.data.lastSeen)}</strong></div></div></SectionCard></div>
      <SectionCard title="System health overview"><p className="muted section-intro">Latest stored telemetry from this endpoint. No health score or threat classification is inferred.</p>{record ? <div className="health-metrics"><MetricCard label="CPU usage" value={formatPercent(record.cpuUsage)} detail="Reported percentage" /><MetricCard label="Memory usage" value={formatPercent(record.memoryUsage)} detail="Reported percentage" /><MetricCard label="Disk usage" value={formatPercent(record.diskUsage)} detail="Reported percentage" /><MetricCard label="Uptime" value={formatDuration(record.uptimeSeconds)} detail="Reported duration" /></div> : <EmptyState title="No telemetry received" description="This endpoint has not reported system health telemetry yet." />}</SectionCard>
      <SectionCard title="Latest telemetry">{record ? <div className="telemetry-detail-grid"><div><span className="muted">Recorded</span><strong>{formatDetailDate(record.recordedAt)}</strong></div><div><span className="muted">CPU</span><strong>{formatPercent(record.cpuUsage)}</strong></div><div><span className="muted">Memory</span><strong>{formatPercent(record.memoryUsage)}</strong><small className="muted">{formatBytes(record.memoryUsed)} / {formatBytes(record.memoryTotal)}</small></div><div><span className="muted">Disk</span><strong>{formatPercent(record.diskUsage)}</strong><small className="muted">{formatBytes(record.diskUsed)} / {formatBytes(record.diskTotal)}</small></div><div><span className="muted">Uptime</span><strong>{formatDuration(record.uptimeSeconds)}</strong></div></div> : <EmptyState title="Telemetry unavailable" description="No stored telemetry record is available for this endpoint." />}</SectionCard>
      <SectionCard title="System performance"><div className="telemetry-history-header"><p className="muted">Bounded history: up to 50 records returned by the telemetry API, ordered oldest to newest for visualization.</p><RefreshButton onClick={() => void telemetry.refetch()} busy={telemetry.isFetching} label="Refresh charts" /></div>{telemetry.isError && !telemetry.data ? <ErrorState message="Unable to load telemetry history for this device." onRetry={() => void telemetry.refetch()} /> : telemetry.isPending && !telemetry.data ? <LoadingSkeleton rows={5} /> : <TelemetryHistoryCharts data={toChronologicalTelemetry(telemetry.data?.items ?? [])} />}{telemetry.isError && telemetry.data && <p className="background-refresh refresh-warning" role="alert">Telemetry refresh failed; showing the last successful chart data.</p>}{telemetry.isFetching && telemetry.data && <p className="background-refresh" role="status">Refreshing telemetry charts…</p>}</SectionCard>
    </> : null}
  </div>;
}
