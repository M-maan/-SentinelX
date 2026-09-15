import { AgentsService } from './agents.service';

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
});
