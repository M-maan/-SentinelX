'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { authApi } from '../lib/auth.api';
import { useAuthStore } from '../lib/auth-store';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/devices', label: 'Devices' },
  { href: '/dashboard/organization', label: 'Organization' },
  { href: '/dashboard/users', label: 'Users' },
];

export function MonitoringShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clear } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return <main className="auth"><section className="card"><h1>Session required</h1><p className="muted">Sign in to access the monitoring console.</p><button className="button" onClick={() => router.push('/login')}>Sign in</button></section></main>;

  const signOut = async () => { await authApi.logout().catch(() => undefined); clear(); router.push('/login'); };
  const visibleLinks = user.role === 'SUPER_ADMIN' ? [...links.slice(0, 2), { href: '/dashboard/organizations', label: 'Organizations' }, ...links.slice(2)] : links;
  return <div className="monitoring-shell">
    <button className="mobile-menu-button" type="button" aria-expanded={mobileOpen} aria-controls="monitoring-nav" onClick={() => setMobileOpen(open => !open)}>{mobileOpen ? 'Close menu' : 'Open menu'}</button>
    <aside className={`monitoring-sidebar ${mobileOpen ? 'is-open' : ''}`} id="monitoring-nav">
      <Link className="brand" href="/dashboard" onClick={() => setMobileOpen(false)}>SENTINELX</Link>
      <p className="sidebar-caption">Monitoring console</p>
      <nav aria-label="Primary navigation">{visibleLinks.map(link => <Link className={pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(`${link.href}/`)) ? 'nav-link active' : 'nav-link'} href={link.href} key={link.href} onClick={() => setMobileOpen(false)}>{link.label}</Link>)}</nav>
      <div className="sidebar-footer"><span className="muted">{user.role.replace('_', ' ')}</span><button className="button secondary" onClick={signOut}>Sign out</button></div>
    </aside>
    <main className="monitoring-main"><header className="console-header"><div><span className="eyebrow">{user.organization?.name ?? 'SentinelX'}</span><span className="muted">Secure endpoint visibility</span></div><span className="user-chip">{user.name}</span></header>{children}</main>
  </div>;
}
