import { TelemetryRecord } from './devices.api';

export type TelemetryChartPoint = {
  id: string;
  recordedAt: string;
  timestamp: number;
  label: string;
  cpuUsage: number | null;
  memoryUsage: number | null;
  diskUsage: number | null;
  memoryUsed: number | string | null;
  memoryTotal: number | string | null;
  diskUsed: number | string | null;
  diskTotal: number | string | null;
};

const timestampLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** The API is newest-first with deterministic id ordering. Reverse the bounded list to preserve that order chronologically. */
export const toChronologicalTelemetry = (records: TelemetryRecord[]): TelemetryChartPoint[] => records
  .filter(record => !Number.isNaN(new Date(record.recordedAt).getTime()))
  .map(record => ({
    id: record.id,
    recordedAt: record.recordedAt,
    timestamp: new Date(record.recordedAt).getTime(),
    label: timestampLabel.format(new Date(record.recordedAt)),
    cpuUsage: record.cpuUsage ?? null,
    memoryUsage: record.memoryUsage ?? null,
    diskUsage: record.diskUsage ?? null,
    memoryUsed: record.memoryUsed ?? null,
    memoryTotal: record.memoryTotal ?? null,
    diskUsed: record.diskUsed ?? null,
    diskTotal: record.diskTotal ?? null,
  }))
  .reverse();
