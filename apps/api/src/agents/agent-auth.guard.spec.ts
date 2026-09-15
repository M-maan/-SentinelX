import { ExecutionContext } from '@nestjs/common';
import { AgentAuthGuard } from './agent-auth.guard';
import { createHash } from 'crypto';

describe('AgentAuthGuard', () => {
  it('accepts a valid Agent credential and binds the principal', async () => {
    const token = 'agent-secret'; const agent = { id: 'a1', agentId: 'host-1', credentialHash: createHash('sha256').update(token).digest('hex'), credentialRevokedAt: null } as any;
    const repo = { createQueryBuilder: () => ({ addSelect: () => ({ where: () => ({ getOne: async () => agent }) }) }) } as any;
    const request: any = { headers: { authorization: `Agent ${token}`, 'x-agent-id': 'host-1' } };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
    expect(await new AgentAuthGuard(repo).canActivate(context)).toBe(true); expect(request.agent).toBe(agent);
  });
  it('rejects revoked credentials', async () => {
    const repo = { createQueryBuilder: () => ({ addSelect: () => ({ where: () => ({ getOne: async () => ({ credentialRevokedAt: new Date() }) }) }) }) } as any;
    const context = { switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Agent revoked' } }) }) } as unknown as ExecutionContext;
    await expect(new AgentAuthGuard(repo).canActivate(context)).rejects.toThrow('invalid or revoked');
  });
});
