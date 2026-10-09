'use client';

import { ReactNode } from 'react';

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="page-header"><div><h1>{title}</h1>{description && <p className="muted">{description}</p>}</div>{action}</div>;
}

export function SectionCard({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return <section className={`section-card ${className}`}>{title && <h2>{title}</h2>}{children}</section>;
}

export function MetricCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return <section className="metric-card"><span className="metric-label">{label}</span><strong>{value}</strong>{detail && <small className="muted">{detail}</small>}</section>;
}

export function DeviceStatusBadge({ status }: { status: 'ONLINE' | 'OFFLINE' }) {
  return <span className={`status-badge ${status === 'ONLINE' ? 'status-online' : 'status-offline'}`} aria-label={`Device status ${status}`}>{status}</span>;
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="skeleton-stack" aria-label="Loading" role="status">{Array.from({ length: rows }, (_, index) => <div className="skeleton" key={index} />)}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="state-panel"><h2>{title}</h2>{description && <p className="muted">{description}</p>}{action}</div>;
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: { message?: string; onRetry?: () => void }) {
  return <div className="state-panel error-panel" role="alert"><h2>Unable to load this view</h2><p>{message}</p>{onRetry && <RefreshButton onClick={onRetry} label="Try again" />}</div>;
}

export function RefreshButton({ onClick, label = 'Refresh', busy = false }: { onClick: () => void; label?: string; busy?: boolean }) {
  return <button className="button secondary compact-button" type="button" onClick={onClick} disabled={busy}>{busy ? 'Refreshing…' : label}</button>;
}

export function ResponsiveTableContainer({ children }: { children: ReactNode }) {
  return <div className="responsive-table" role="region" aria-label="Scrollable data table" tabIndex={0}>{children}</div>;
}
