import { request } from './devices.api';

export type DashboardSummary = {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  osDistribution: Array<{ os: string; count: number }>;
  agentVersions: Array<{ version: string; count: number }>;
};

export const monitoringApi = {
  summary: (token: string) => request('/dashboard/summary', token) as Promise<DashboardSummary>,
};
