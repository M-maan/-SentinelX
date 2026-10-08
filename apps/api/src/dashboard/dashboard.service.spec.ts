import { DashboardService } from './dashboard.service';
import { Role } from '../database/entities/user.entity';

describe('DashboardService', () => {
  const config = { get: jest.fn().mockReturnValue(120) } as any;
  const repository = { query: jest.fn() } as any;
  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(repository, config);
  });

  const arrange = (counts: unknown[], operatingSystems: unknown[] = [], versions: unknown[] = []) => {
    repository.query
      .mockResolvedValueOnce(counts)
      .mockResolvedValueOnce(operatingSystems)
      .mockResolvedValueOnce(versions);
  };

  it('returns zero counts and empty distributions for an empty organization', async () => {
    arrange([{ totalDevices: 0, onlineDevices: 0, offlineDevices: 0 }]);

    await expect(service.summary({ role: Role.ANALYST, organizationId: 'org-empty' })).resolves.toEqual({
      totalDevices: 0,
      onlineDevices: 0,
      offlineDevices: 0,
      osDistribution: [],
      agentVersions: [],
    });
  });

  it('maps aggregate counts without loading telemetry', async () => {
    arrange(
      [{ totalDevices: '25', onlineDevices: '18', offlineDevices: '7' }],
      [{ os: 'Linux', count: '10' }, { os: 'Windows', count: '15' }],
      [{ version: '1.0.0', count: '25' }],
    );

    await expect(service.summary({ role: Role.SECURITY_ADMIN, organizationId: 'org-a' })).resolves.toEqual({
      totalDevices: 25,
      onlineDevices: 18,
      offlineDevices: 7,
      osDistribution: [{ os: 'Linux', count: 10 }, { os: 'Windows', count: 15 }],
      agentVersions: [{ version: '1.0.0', count: 25 }],
    });
    expect(repository.query).toHaveBeenCalledTimes(3);
    expect((repository.query.mock.calls as Array<[string, unknown[]]>).map(([sql]) => sql.toLowerCase())).not.toEqual(expect.arrayContaining([expect.stringContaining('telemetry')]));
  });

  it('normalizes missing operating system and version values to Unknown', async () => {
    arrange(
      [{ totalDevices: 1, onlineDevices: 1, offlineDevices: 0 }],
      [{ os: null, count: '1' }],
      [{ version: null, count: '1' }],
    );

    const result = await service.summary({ role: Role.VIEWER, organizationId: 'org-a' });
    expect(result.osDistribution).toEqual([{ os: 'Unknown', count: 1 }]);
    expect(result.agentVersions).toEqual([{ version: 'Unknown', count: 1 }]);
  });

  it('applies the authenticated organization to every aggregate query', async () => {
    arrange([{ totalDevices: 2, onlineDevices: 1, offlineDevices: 1 }]);

    await service.summary({ role: Role.ANALYST, organizationId: 'org-a' });

    for (const [sql, params] of repository.query.mock.calls as Array<[string, unknown[]]>) {
      expect(sql).toContain(`organization_id = $${params.length === 2 ? 2 : 1}`);
      expect(params).toContain('org-a');
    }
  });

  it('returns no records when a non-super-admin has no organization', async () => {
    arrange([{ totalDevices: 0, onlineDevices: 0, offlineDevices: 0 }]);

    await service.summary({ role: Role.VIEWER, organizationId: null });

    for (const [sql] of repository.query.mock.calls as Array<[string, unknown[]]>) expect(sql).toContain('WHERE 1 = 0');
  });

  it('keeps Super Admin global scope without accepting a client organization id', async () => {
    arrange([{ totalDevices: 4, onlineDevices: 3, offlineDevices: 1 }]);

    const result = await service.summary({ role: Role.SUPER_ADMIN, organizationId: null });

    expect(result.totalDevices).toBe(4);
    for (const [sql, params] of repository.query.mock.calls as Array<[string, unknown[]]>) {
      expect(sql).not.toContain('organization_id = $');
      expect(params.length).toBeLessThanOrEqual(1);
    }
  });

  it('uses the configured heartbeat cutoff for online and offline aggregation', async () => {
    arrange([{ totalDevices: 2, onlineDevices: 1, offlineDevices: 1 }]);
    config.get.mockReturnValue(300);

    await service.summary({ role: Role.ANALYST, organizationId: 'org-a' });

    expect(repository.query.mock.calls[0][0]).toContain('last_seen >= $1');
    expect(repository.query.mock.calls[0][0]).toContain('last_seen IS NULL OR last_seen < $1');
    expect(repository.query.mock.calls[0][1][0]).toBeInstanceOf(Date);
  });
});
