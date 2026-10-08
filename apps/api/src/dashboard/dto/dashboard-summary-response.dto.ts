export class DashboardSummaryResponseDto {
  totalDevices!: number;
  onlineDevices!: number;
  offlineDevices!: number;
  osDistribution!: Array<{ os: string; count: number }>;
  agentVersions!: Array<{ version: string; count: number }>;
}
