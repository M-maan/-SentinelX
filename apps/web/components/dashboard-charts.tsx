'use client';

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const statusColors = ['#35d2a1', '#ff9aaa'];

export function StatusDistributionChart({ online, offline }: { online: number; offline: number }) {
  const data = [{ name: 'Online', value: online }, { name: 'Offline', value: offline }];
  const total = online + offline;
  if (total === 0) return <div className="chart-empty">No enrolled devices to visualize.</div>;
  return <div className="chart-block" role="img" aria-label={`Device status distribution: ${online} online and ${offline} offline`}><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={90} paddingAngle={3}>{data.map((entry, index) => <Cell fill={statusColors[index]} key={entry.name} />)}</Pie><Tooltip contentStyle={{ background: '#111a2a', border: '1px solid #25344d', borderRadius: 8 }} /><text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fill="#e8eef8" fontSize="24" fontWeight="700">{total}</text><text x="50%" y="61%" textAnchor="middle" dominantBaseline="middle" fill="#8b9bb2" fontSize="12">devices</text></PieChart></ResponsiveContainer><div className="chart-legend">{data.map((entry, index) => <span key={entry.name}><i style={{ background: statusColors[index] }} />{entry.name}: {entry.value} ({Math.round(entry.value / total * 100)}%)</span>)}</div></div>;
}

export function OsDistributionChart({ data }: { data: Array<{ os: string; count: number }> }) {
  if (data.length === 0) return <div className="chart-empty">No operating-system data available.</div>;
  return <div className="chart-block" role="img" aria-label="Operating system distribution"><ResponsiveContainer width="100%" height={260}><BarChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 5 }}><CartesianGrid stroke="#25344d" vertical={false} /><XAxis dataKey="os" tick={{ fill: '#8b9bb2', fontSize: 11 }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#8b9bb2', fontSize: 11 }} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: '#17263c' }} contentStyle={{ background: '#111a2a', border: '1px solid #25344d', borderRadius: 8 }} /><Bar dataKey="count" name="Devices" fill="#5e8cff" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer><p className="chart-text-summary">{data.map(item => `${item.os}: ${item.count}`).join(' · ')}</p></div>;
}
