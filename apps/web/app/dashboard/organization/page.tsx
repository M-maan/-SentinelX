'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../lib/auth-store';
import { Organization, organizationsApi } from '../../../lib/organizations.api';

export default function OrganizationPage() {
  const { accessToken, user } = useAuthStore();
  const [organization, setOrganization] = useState<Pick<Organization, 'id' | 'name' | 'industry'> | null>(user?.organization ?? null);
  const [error, setError] = useState('');
  useEffect(() => { if (accessToken) organizationsApi.current(accessToken).then(setOrganization).catch(e => setError(e.message)); }, [accessToken]);
  return <main className="main"><Link href="/dashboard">← Dashboard</Link><h1>Organization</h1>{error && <p className="error">{error}</p>}<section className="card" style={{ width: 'min(100%, 620px)' }}><h2>{organization?.name ?? 'Loading...'}</h2><p>Industry: {organization?.industry ?? 'Not set'}</p><p>Your role: {user?.role?.replace('_', ' ')}</p></section></main>;
}
