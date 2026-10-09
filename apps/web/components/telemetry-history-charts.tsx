'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TelemetryChartPoint } from '../lib/telemetry-history';

const chartTheme = { grid: '#25344d', axis: '#8b9bb2', tooltip: { background: '#111a2a', border: '1px solid #25344d', borderRadius: 8 } };

function metricSummary(data: TelemetryChartPoint[], key: 'cpuUsage' | 'memoryUsage' | 'diskUsage') {
  const values = data.map(point => point[key]).filter((value): value is number => value !== null);
  return values.length ? `${values.length} of ${data.length} readings available; latest reported value ${values[values.length - 1]}%.` : 'No reported readings for this metric.';
}

function TelemetryMetricChart({ data, dataKey, color, title, description }: { data: TelemetryChartPoint[]; dataKey: 'cpuUsage' | 'memoryUsage' | 'diskUsage'; color: string; title: string; description: string }) {
  const available = data.some(point => point[dataKey] !== null);
  if (!available) return <div className="telemetry-chart"><h3>{title}</h3><p className="muted">{description}</p><div className="chart-empty">No reported {title.toLowerCase()} readings.</div></div>;
  return <div className="telemetry-chart"><h3>{title}</h3><p className="muted">{description}</p><div className="telemetry-chart-visual" role="img" aria-label={`${title} history chart. ${metricSummary(data, dataKey)}`}><ResponsiveContainer width="100%" height={250}><LineChart data={data} margin={{ top: 8, right: 14, left: -12, bottom: 4 }}><CartesianGrid stroke={chartTheme.grid} vertical={false} /><XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={value => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} tick={{ fill: chartTheme.axis, fontSize: 11 }} tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} unit="%" tick={{ fill: chartTheme.axis, fontSize: 11 }} tickLine={false} axisLine={false} /><Tooltip labelFormatter={value => new Date(Number(value)).toLocaleString()} formatter={(value: unknown) => value === null || value === undefined ? ['Not reported', title] : [`${value}%`, title]} contentStyle={chartTheme.tooltip} /><Line type="monotone" dataKey={dataKey} name={title} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} connectNulls={false} /></LineChart></ResponsiveContainer></div><p className="chart-text-summary">{metricSummary(data, dataKey)}</p></div>;
}

export function TelemetryHistoryCharts({ data }: { data: TelemetryChartPoint[] }) {
  if (data.length === 0) return <div className="chart-empty">No valid timestamped telemetry records are available.</div>;
  return <div className="telemetry-history-grid"><TelemetryMetricChart data={data} dataKey="cpuUsage" color="#5e8cff" title="CPU usage" description="Recorded processor utilization" /><TelemetryMetricChart data={data} dataKey="memoryUsage" color="#35d2a1" title="Memory usage" description="Recorded memory utilization" /><TelemetryMetricChart data={data} dataKey="diskUsage" color="#ffbd66" title="Disk usage" description="Recorded disk utilization" /></div>;
}
