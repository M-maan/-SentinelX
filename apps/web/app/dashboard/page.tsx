'use client';

import { EmptyState, MetricCard, PageHeader, SectionCard } from '../../components/monitoring-ui';
import { useAuthStore } from '../../lib/auth-store';

export default function Dashboard() {
  const user = useAuthStore(state => state.user);
  return <div className="console-page">
    <PageHeader title={`Welcome, ${user?.name ?? 'operator'}`} description="Your secure endpoint monitoring workspace." />
    <div className="metric-grid"><MetricCard label="Monitoring status" value="Ready" detail="Connected to SentinelX" /><MetricCard label="Organization" value={user?.organization?.name ?? '—'} detail={user?.role?.replace('_', ' ')} /><MetricCard label="Next step" value="Devices" detail="Review enrolled endpoints" /></div>
    <SectionCard title="Monitoring foundation"><EmptyState title="Your security workspace is ready" description="Dashboard metrics and device monitoring views will appear here as the monitoring console expands." /></SectionCard>
  </div>;
}
