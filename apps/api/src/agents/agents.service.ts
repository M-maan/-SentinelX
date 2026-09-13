import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { Agent, AgentStatus } from '../database/entities/agent.entity';
import { AgentTelemetry } from '../database/entities/agent-telemetry.entity';
import { Organization } from '../database/entities/organization.entity';
import { Role } from '../database/entities/user.entity';
import { EnrollAgentDto, TelemetryDto } from './dto/agent.dto';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
type Principal = { role: Role; organizationId: string | null };

@Injectable()
export class AgentsService {
  constructor(@InjectRepository(Agent) private agents: Repository<Agent>, @InjectRepository(AgentTelemetry) private telemetry: Repository<AgentTelemetry>, @InjectRepository(Organization) private organizations: Repository<Organization>, private config: ConfigService) {}

  async createEnrollmentToken(organizationId: string) {
    const token = `sx_enroll_${randomBytes(24).toString('base64url')}`;
    await this.organizations.update(organizationId, { enrollmentTokenHash: hash(token), enrollmentTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000), enrollmentTokenRevokedAt: null });
    return { token, expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), apiUrl: `${this.config.get('API_URL') ?? `http://localhost:${this.config.get('PORT', 3001)}`}/api/v1` };
  }

  async enroll(dto: EnrollAgentDto) {
    const organizations = await this.organizations.createQueryBuilder('organization').addSelect(['organization.enrollmentTokenHash', 'organization.enrollmentTokenExpiresAt', 'organization.enrollmentTokenRevokedAt']).getMany();
    const candidate = hash(dto.enrollmentToken);
    const organization = organizations.find(org => org.enrollmentTokenHash && !org.enrollmentTokenRevokedAt && org.enrollmentTokenExpiresAt && org.enrollmentTokenExpiresAt > new Date() && timingSafeEqual(Buffer.from(org.enrollmentTokenHash), Buffer.from(candidate)));
    if (!organization) throw new UnauthorizedException('Enrollment token is invalid or expired');
    let agent = await this.agents.findOne({ where: { agentId: dto.agentId } });
    if (agent && agent.organizationId !== organization.id) throw new ConflictException('Agent identity is already enrolled in another organization');
    const token = randomBytes(32).toString('base64url');
    const entity = this.agents.create({ ...(agent ?? {}), organizationId: organization.id, agentId: dto.agentId, hostname: dto.hostname, operatingSystem: dto.operatingSystem, osVersion: dto.osVersion, architecture: dto.architecture, agentVersion: dto.agentVersion, credentialHash: hash(token), credentialRevokedAt: null, status: AgentStatus.ONLINE, lastSeen: new Date() });
    agent = await this.agents.save(entity);
    return { id: agent.id, agentId: agent.agentId, agentToken: token, organizationId: organization.id, apiUrl: `${this.config.get('API_URL') ?? `http://localhost:${this.config.get('PORT', 3001)}`}/api/v1` };
  }

  async heartbeat(agent: Agent, agentVersion?: string, ipAddress?: string) { await this.agents.update(agent.id, { status: AgentStatus.ONLINE, lastSeen: new Date(), ...(agentVersion ? { agentVersion } : {}), ...(ipAddress ? { ipAddress } : {}) }); return { ok: true, status: AgentStatus.ONLINE, lastSeen: new Date().toISOString() }; }
  async revokeEnrollmentToken(organizationId: string) { await this.organizations.update(organizationId, { enrollmentTokenRevokedAt: new Date() }); return { ok: true, revoked: true }; }
  private async findScoped(principal: Principal, identifier: string) { const scope = this.scope(principal); return this.agents.findOne({ where: [{ id: identifier, ...scope }, { agentId: identifier, ...scope }] }); }
  async rotateAgentToken(principal: Principal, id: string) { const agent = await this.findScoped(principal, id); if (!agent) throw new NotFoundException('Device not found'); const token = randomBytes(32).toString('base64url'); await this.agents.update(agent.id, { credentialHash: hash(token), credentialRevokedAt: null }); return { id: agent.id, agentId: agent.agentId, agentToken: token }; }
  async revokeAgentToken(principal: Principal, id: string) { const agent = await this.findScoped(principal, id); if (!agent) throw new NotFoundException('Device not found'); await this.agents.update(agent.id, { credentialRevokedAt: new Date(), status: AgentStatus.OFFLINE }); return { ok: true, revoked: true }; }
  async recordTelemetry(agent: Agent, dto: TelemetryDto) { const row = this.telemetry.create({ agentId: agent.id, cpuUsage: dto.cpuUsagePercent, memoryTotal: dto.memoryTotalBytes, memoryUsed: dto.memoryUsedBytes, memoryUsage: dto.memoryUsagePercent, diskTotal: dto.diskTotalBytes, diskUsed: dto.diskUsedBytes, diskUsage: dto.diskUsagePercent, uptimeSeconds: dto.uptimeSeconds, recordedAt: new Date(dto.timestamp) }); await this.telemetry.save(row); await this.agents.update(agent.id, { status: AgentStatus.ONLINE, lastSeen: new Date() }); return { ok: true }; }
  private scope(principal: Principal) { return principal.role === Role.SUPER_ADMIN ? {} : { organizationId: principal.organizationId ?? undefined }; }
  async list(principal: Principal, page = 1, limit = 25, status?: AgentStatus, operatingSystem?: string, search?: string) { const qb = this.agents.createQueryBuilder('agent').orderBy('agent.lastSeen', 'DESC', 'NULLS LAST').skip((page - 1) * limit).take(limit); if (principal.role !== Role.SUPER_ADMIN) qb.andWhere('agent.organization_id = :org', { org: principal.organizationId }); if (status) qb.andWhere('agent.status = :status', { status }); if (operatingSystem) qb.andWhere('LOWER(agent.operating_system) = LOWER(:os)', { os: operatingSystem }); if (search) qb.andWhere('(agent.hostname ILIKE :search OR agent.agent_id ILIKE :search)', { search: `%${search}%` }); const [items, total] = await qb.getManyAndCount(); const threshold = Number(this.config.get('AGENT_OFFLINE_THRESHOLD_SECONDS', 120)); const now = Date.now(); return { items: items.map(item => ({ ...item, status: !item.lastSeen || now - item.lastSeen.getTime() > threshold * 1000 ? AgentStatus.OFFLINE : AgentStatus.ONLINE })), page, limit, total }; }
  async detail(principal: Principal, id: string) { const agent = await this.agents.findOne({ where: { id, ...this.scope(principal) } }); if (!agent) throw new NotFoundException('Device not found'); const latestTelemetry = await this.telemetry.find({ where: { agentId: id }, order: { recordedAt: 'DESC' }, take: 20 }); return { ...agent, latestTelemetry }; }
}
