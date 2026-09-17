import { AgentsService } from './agents.service';
import { AgentStatus } from '../database/entities/agent.entity';
import { Role } from '../database/entities/user.entity';

describe('AgentsService lifecycle', () => {
  it('creates an enrollment token with expiry and clears revocation', async () => {
    const update = jest.fn().mockResolvedValue(undefined); const service = new AgentsService({} as any, {} as any, { update } as any, { get: (_k: string, fallback: any) => fallback } as any);
    const result = await service.createEnrollmentToken('org-1');
    expect(result.token).toMatch(/^sx_enroll_/); expect(result.expiresAt).toBeTruthy(); expect(update).toHaveBeenCalledWith('org-1', expect.objectContaining({ enrollmentTokenRevokedAt: null }));
  });
  it('rotates and revokes an agent credential inside its organization', async () => {
    const update = jest.fn().mockResolvedValue(undefined); const findOne = jest.fn().mockResolvedValue({ id: 'agent-1', organizationId: 'org-1', agentId: 'host-1' }); const service = new AgentsService({ update, findOne } as any, {} as any, {} as any, {} as any);
    const principal = { role: 'SECURITY_ADMIN', organizationId: 'org-1' } as any;
    const rotated = await service.rotateAgentToken(principal, 'agent-1'); expect(rotated.agentToken.length).toBeGreaterThan(20);
    await service.revokeAgentToken(principal, 'agent-1'); expect(update).toHaveBeenLastCalledWith('agent-1', expect.objectContaining({ credentialRevokedAt: expect.any(Date) }));
  });
  it('filters devices by the effective offline status from lastSeen', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:10:00Z'));
    const qb = { orderBy: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([
      { id: 'stale', organizationId: 'org-1', agentId: 'agent-stale', hostname: 'DESKTOP-HEA4VN5', operatingSystem: 'windows', status: AgentStatus.ONLINE, lastSeen: new Date('2026-01-01T00:00:00Z') },
      { id: 'fresh', organizationId: 'org-1', agentId: 'agent-fresh', hostname: 'DESKTOP-NEW', operatingSystem: 'windows', status: AgentStatus.ONLINE, lastSeen: new Date('2026-01-01T00:09:30Z') }
    ]) };
    const service = new AgentsService({ createQueryBuilder: jest.fn().mockReturnValue(qb) } as any, {} as any, {} as any, { get: (_key: string, fallback: any) => fallback } as any);
    const result = await service.list({ role: Role.SECURITY_ADMIN, organizationId: 'org-1' }, 1, 10, AgentStatus.OFFLINE, 'windows', 'DESKTOP');
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('stale');
    expect(qb.andWhere.mock.calls.some(([where]) => String(where).includes('agent.status'))).toBe(false);
    jest.useRealTimers();
  });
});
