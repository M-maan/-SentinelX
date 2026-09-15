import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { Agent } from '../database/entities/agent.entity';

@Injectable()
export class AgentAuthGuard implements CanActivate {
  constructor(@InjectRepository(Agent) private agents: Repository<Agent>) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { agent?: Agent }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Agent ')) throw new UnauthorizedException('Missing agent token');
    const token = header.slice(6).trim();
    if (!token) throw new UnauthorizedException('Missing agent token');
    const hash = createHash('sha256').update(token).digest('hex');
    const query = this.agents.createQueryBuilder('agent').addSelect('agent.credentialHash').where('agent.credentialHash = :hash', { hash });
    const agent = await query.getOne();
    if (!agent || agent.credentialRevokedAt) throw new UnauthorizedException('Agent token is invalid or revoked');
    const suppliedId = request.headers['x-agent-id'];
    if (suppliedId && suppliedId !== agent.agentId) throw new UnauthorizedException('Agent identity mismatch');
    request.agent = agent;
    return true;
  }
}
