import { NotFoundException } from '@nestjs/common';
import { AgentsService } from './agents.service';

describe('AgentsService telemetry history', () => {
  const config = { get: jest.fn().mockReturnValue(120) } as any;
  const agentRepository = { findOne: jest.fn() } as any;
  const telemetryRepository = { find: jest.fn() } as any;
  let service: AgentsService;

  const agent = (overrides: Record<string, unknown> = {}) => ({ id: 'device-a', organizationId: 'org-a', agentId: 'agent-a', credentialHash: 'must-not-leak', ...overrides });
  const row = (id: string, recordedAt: string, overrides: Record<string, unknown> = {}) => ({
    id,
    agentId: 'device-a',
    cpuUsage: 25.5,
    memoryTotal: 1000,
    memoryUsed: 480,
    memoryUsage: 48,
    diskTotal: 2000,
    diskUsed: 1200,
    diskUsage: 60,
    uptimeSeconds: 86400,
    recordedAt: new Date(recordedAt),
    createdAt: new Date(recordedAt),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AgentsService(agentRepository, telemetryRepository, {} as any, config);
    agentRepository.findOne.mockResolvedValue(agent());
    telemetryRepository.find.mockResolvedValue([]);
  });

  it('returns bounded recent telemetry in deterministic newest-first order', async () => {
    const rows = [row('telemetry-new', '2026-10-09T10:05:00Z'), row('telemetry-old', '2026-10-09T10:04:00Z')];
    telemetryRepository.find.mockResolvedValue(rows);

    const result = await service.telemetryHistory({ role: 'VIEWER' as any, organizationId: 'org-a' }, 'device-a', { limit: 2 });

    expect(result).toMatchObject({ total: 2, limit: 2 });
    expect(result.items.map(item => item.id)).toEqual(['telemetry-new', 'telemetry-old']);
    expect(result.items[0]).not.toHaveProperty('credentialHash');
    expect(telemetryRepository.find).toHaveBeenCalledWith({ where: { agentId: 'device-a' }, order: { recordedAt: 'DESC', id: 'DESC' }, take: 2 });
  });

  it('uses one-row latest mode and preserves duplicate timestamp tie-breaking', async () => {
    telemetryRepository.find.mockResolvedValue([row('telemetry-high-id', '2026-10-09T10:05:00Z')]);

    const result = await service.telemetryHistory({ role: 'VIEWER' as any, organizationId: 'org-a' }, 'device-a', { latest: true, limit: 100 });

    expect(result).toMatchObject({ total: 1, limit: 1 });
    expect(telemetryRepository.find).toHaveBeenCalledWith({ where: { agentId: 'device-a' }, order: { recordedAt: 'DESC', id: 'DESC' }, take: 1 });
  });

  it('uses the default limit and returns a consistent empty response', async () => {
    await expect(service.telemetryHistory({ role: 'VIEWER' as any, organizationId: 'org-a' }, 'device-a')).resolves.toEqual({ items: [], total: 0, limit: 50 });
    expect(telemetryRepository.find).toHaveBeenCalledWith({ where: { agentId: 'device-a' }, order: { recordedAt: 'DESC', id: 'DESC' }, take: 50 });
  });

  it('preserves partial metrics as stored values without inventing data', async () => {
    telemetryRepository.find.mockResolvedValue([row('telemetry-partial', '2026-10-09T10:05:00Z', { memoryUsage: null, diskUsage: null })]);

    const result = await service.telemetryHistory({ role: 'VIEWER' as any, organizationId: 'org-a' }, 'device-a', { limit: 1 });

    expect(result.items[0]).toMatchObject({ memoryUsage: null, diskUsage: null, uptimeSeconds: 86400 });
  });

  it('validates ownership before reading telemetry and supports Super Admin scope', async () => {
    agentRepository.findOne.mockResolvedValueOnce(null);
    await expect(service.telemetryHistory({ role: 'VIEWER' as any, organizationId: 'org-other' }, 'device-a')).rejects.toBeInstanceOf(NotFoundException);
    expect(telemetryRepository.find).not.toHaveBeenCalled();

    agentRepository.findOne.mockResolvedValueOnce(agent());
    await service.telemetryHistory({ role: 'SUPER_ADMIN' as any, organizationId: null }, 'agent-a', { latest: true });
    expect(agentRepository.findOne).toHaveBeenLastCalledWith({ where: [{ agentId: 'agent-a' }] });
  });
});
