export const displayDetailValue = (value: string | null | undefined, fallback = 'Not reported') => value || fallback;

export const formatDetailDate = (value: string | null | undefined) => {
  if (!value) return 'Not reported';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not reported' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export const formatBytes = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return 'Not reported';
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return 'Not reported';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let amount = bytes;
  let unit = -1;
  while (amount >= 1024 && unit < units.length - 1) { amount /= 1024; unit += 1; }
  return `${amount.toFixed(amount >= 10 ? 0 : 1)} ${units[unit]}`;
};

export const formatDuration = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return 'Not reported';
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return 'Not reported';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  if (minutes || hours || days) parts.push(`${minutes}m`);
  if (!parts.length) parts.push(`${Math.floor(seconds)}s`);
  return parts.join(' ');
};

export const formatPercent = (value: number | null | undefined) => value === null || value === undefined ? 'Not reported' : `${value}%`;
