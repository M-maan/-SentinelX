import { MonitoringShell } from '../../components/monitoring-shell';

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <MonitoringShell>{children}</MonitoringShell>;
}
