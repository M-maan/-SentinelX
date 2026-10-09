import { NotFoundException } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentStatus } from '../database/entities/agent.entity';

describe('AgentsService device detail', () => {
  const config = { get: jest.fn().mockReturnValue(120) } as any;
  const agentRepository = { findOne: jest.fn() } as any;
  const telemetryRepository = { find: jest.fn() } as any;
  let service: AgentsService;

  const agent = (overrides: Record<string, unknown> = {}) => ({
    id: 'device-a',
    organizationId: 'org-a',
    agentId: 'agent-a',
    hostname: 'endpoint-a',
    operatingSystem: 'Linux',
    osVersion: '22.04',
    architecture: 'x64',
    ipAddress: '192.0.2.10',
    status: AgentStatus.OFFLINE,
    agentVersion: '1.2.3',
    credentialHash: 'must-not-leak',
    credentialRevokedAt: null,
    firstSeen: new Date('2026-10-08T10:00:00Z'),
    lastSeen: new Date(),
    createdAt: new Date('2026-10-08T10:00:00Z'),
    updatedAt: new Date('2026-10-08T10:05:00Z'),
    ...overrides,
  });

  const telemetry = (overrides: Record<string, unknown> = {}) => ({
    id: 'telemetry-a',
    agentId: 'device-a',
    cpuUsage: 25.5,
    memoryTotal: 1000,
    memoryUsed: 500,
    memoryUsage: 50,
    diskTotal: 2000,
    diskUsed: 1200,
    diskUsage: 60,
    uptimeSeconds: 86400,
    recordedAt: new Date('2026-10-08T10:05:00Z'),
    createdAt: new Date('2026-10-08T10:05:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue(120);
    service = new AgentsService(agentRepository, telemetryRepository, {} as any, config);
  });

  it('returns device fields, effective online status, and only the latest telemetry row', async () => {
    const record = agent({ lastSeen: new Date() });
    agentRepository.findOne.mockResolvedValue(record);
    telemetryRepository.find.mockResolvedValue([telemetry()]);

    const result = await service.detail({ role: 'VIEWER' as any, organizationId: 'org-a' }, 'device-a');

    expect(result).toMatchObject({ id: 'device-a', agentId: 'agent-a', hostname: 'endpoint-a', operatingSystem: 'Linux', osVersion: '22.04', architecture: 'x64', ipAddress: '192.0.2.10', agentVersion: '1.2.3', status: AgentStatus.ONLINE, firstSeen: record.firstSeen, lastSeen: record.lastSeen });
    expect(result.latestTelemetry).toHaveLength(1);
    expect(result.latestTelemetry[0]).toMatchObject({ cpuUsage: 25.5, memoryUsage: 50, diskUsage: 60, uptimeSeconds: 86400, recordedAt: expect.any(Date) });
    expect(result).not.toHaveProperty('credentialHash');
    expect(telemetryRepository.find).toHaveBeenCalledWith({ where: { agentId: 'device-a' }, order: { recordedAt: 'DESC', id: 'DESC' }, take: 1 });
  });

  it('reports stale and missing heartbeats as offline', async () => {
    agentRepository.findOne.mockResolvedValue(agent({ lastSeen: new Date(Date.now() - 121000) }));
    telemetryRepository.find.mockResolvedValue([]);
    await expect(service.detail({ role: 'VIEWER' as any, organizationId: 'org-a' }, 'device-a')).resolves.toMatchObject({ status: AgentStatus.OFFLINE, latestTelemetry: [] });

    agentRepository.findOne.mockResolvedValue(agent({ lastSeen: null }));
    await expect(service.detail({ role: 'VIEWER' as any, organizationId: 'org-a' }, 'device-a')).resolves.toMatchObject({ status: AgentStatus.OFFLINE, latestTelemetry: [] });
  });

  it('preserves partial nullable telemetry/device values without inventing data', async () => {
    agentRepository.findOne.mockResolvedValue(agent({ ipAddress: null, lastSeen: null }));
    telemetryRepository.find.mockResolvedValue([telemetry({ memoryUsage: null, diskUsage: null })]);

    const result = await service.detail({ role: 'VIEWER' as any, organizationId: 'org-a' }, 'device-a');

    expect(result.ipAddress).toBeNull();
    expect(result.latestTelemetry[0].memoryUsage).toBeNull();
    expect(result.latestTelemetry[0].diskUsage).toBeNull();
  });

  it('scopes lookup before telemetry access and hides cross-organization devices', async () => {
    agentRepository.findOne.mockResolvedValue(null);

    await expect(service.detail({ role: 'VIEWER' as any, organizationId: 'org-other' }, 'device-a')).rejects.toBeInstanceOf(NotFoundException);
    expect(agentRepository.findOne).toHaveBeenCalledWith({ where: { id: 'device-a', organizationId: 'org-other' } });
    expect(telemetryRepository.find).not.toHaveBeenCalled();
  });

  it('allows Super Admin global scope without adding an organization filter', async () => {
    agentRepository.findOne.mockResolvedValue(agent());
    telemetryRepository.find.mockResolvedValue([]);

    await service.detail({ role: 'SUPER_ADMIN' as any, organizationId: null }, 'device-a');

    expect(agentRepository.findOne).toHaveBeenCalledWith({ where: { id: 'device-a' } });
  });
});
