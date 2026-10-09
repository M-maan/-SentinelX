'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DeviceStatusBadge, EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionCard } from '../../../../components/monitoring-ui';
import { useAuthStore } from '../../../../lib/auth-store';
import { DeviceDetail, devicesApi } from '../../../../lib/devices.api';

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>(); const { accessToken } = useAuthStore(); const [device, setDevice] = useState<DeviceDetail | null>(null); const [error, setError] = useState('');
  useEffect(() => { if (accessToken && id) devicesApi.detail(accessToken, id).then(setDevice).catch(value => setError(value instanceof Error ? value.message : 'Unable to load device')); }, [accessToken, id]);
  return <div className="console-page"><Link href="/dashboard/devices" className="muted">← Devices</Link>{error ? <ErrorState message={error} /> : !device ? <LoadingSkeleton rows={4} /> : <><PageHeader title={device.hostname} description={`${device.operatingSystem} ${device.osVersion} · ${device.architecture}`} action={<DeviceStatusBadge status={device.status} />} /><SectionCard title="Device details"><div className="detail-grid"><div><span className="muted">Agent ID</span><strong>{device.agentId}</strong></div><div><span className="muted">Agent version</span><strong>{device.agentVersion}</strong></div><div><span className="muted">Last seen</span><strong>{device.lastSeen ?? 'Never'}</strong></div><div><span className="muted">IP address</span><strong>{device.ipAddress ?? 'Not reported'}</strong></div></div></SectionCard><SectionCard title="Latest telemetry">{device.latestTelemetry.length === 0 ? <EmptyState title="No telemetry received" description="This device has not reported telemetry yet." /> : <div className="telemetry-summary">{device.latestTelemetry.map(record => <div className="telemetry-row" key={record.id}><span className="muted">{new Date(record.recordedAt).toLocaleString()}</span><span>CPU {record.cpuUsage}%</span><span>Memory {record.memoryUsage ?? '—'}%</span><span>Disk {record.diskUsage ?? '—'}%</span></div>)}</div>}</SectionCard></>}</div>;
}
