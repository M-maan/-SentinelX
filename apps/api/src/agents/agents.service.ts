import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { Agent, AgentStatus } from '../database/entities/agent.entity';
import { AgentTelemetry } from '../database/entities/agent-telemetry.entity';
import { Organization } from '../database/entities/organization.entity';
import { Role } from '../database/entities/user.entity';
import { DeviceListQueryDto, DeviceSortBy, EnrollAgentDto, SortOrder, TelemetryDto } from './dto/agent.dto';

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
  async list(principal: Principal, query: DeviceListQueryDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const threshold = Number(this.config.get('AGENT_OFFLINE_THRESHOLD_SECONDS', 120));
    const cutoff = new Date(Date.now() - threshold * 1000);
    const qb = this.agents.createQueryBuilder('agent');
    const effectiveStatus = 'CASE WHEN agent.last_seen IS NOT NULL AND agent.last_seen >= :cutoff THEN 0 ELSE 1 END';

    if (principal.role !== Role.SUPER_ADMIN) qb.andWhere('agent.organization_id = :org', { org: principal.organizationId });
    qb.setParameter('cutoff', cutoff);
    if (query.status === AgentStatus.ONLINE) qb.andWhere('agent.last_seen IS NOT NULL AND agent.last_seen >= :cutoff');
    if (query.status === AgentStatus.OFFLINE) qb.andWhere('(agent.last_seen IS NULL OR agent.last_seen < :cutoff)');
    if (query.os) qb.andWhere('LOWER(agent.operating_system) = LOWER(:os)', { os: query.os });
    if (query.agentVersion) qb.andWhere('LOWER(agent.agent_version) = LOWER(:agentVersion)', { agentVersion: query.agentVersion });
    if (query.hostname) qb.andWhere('LOWER(agent.hostname) = LOWER(:hostname)', { hostname: query.hostname });
    if (query.search) qb.andWhere(`agent.hostname ILIKE :search ESCAPE '\\'`, { search: `%${this.escapeLike(query.search)}%` });

    const direction = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    if (query.sortBy === DeviceSortBy.HOSTNAME) qb.orderBy('agent.hostname', direction).addOrderBy('agent.id', 'ASC');
    else if (query.sortBy === DeviceSortBy.STATUS) qb.orderBy(effectiveStatus, direction).addOrderBy('agent.id', 'ASC');
    else if (query.sortBy === DeviceSortBy.RECENTLY_ACTIVE) qb.orderBy(effectiveStatus, direction).addOrderBy('agent.last_seen', direction, 'NULLS LAST').addOrderBy('agent.id', 'ASC');
    else qb.orderBy('agent.last_seen', direction, 'NULLS LAST').addOrderBy('agent.id', 'ASC');

    const [items, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { items: items.map(item => ({ ...item, status: this.effectiveStatus(item.lastSeen, threshold) })), page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) };
  }
  private effectiveStatus(lastSeen: Date | null, threshold: number) { return lastSeen && Date.now() - lastSeen.getTime() <= threshold * 1000 ? AgentStatus.ONLINE : AgentStatus.OFFLINE; }
  private escapeLike(value: string) { return value.replace(/[\\%_]/g, character => `\\${character}`); }
  async detail(principal: Principal, id: string) {
    const agent = await this.agents.findOne({ where: { id, ...this.scope(principal) } });
    if (!agent) throw new NotFoundException('Device not found');
    const latestTelemetry = await this.telemetry.find({ where: { agentId: agent.id }, order: { recordedAt: 'DESC', id: 'DESC' }, take: 1 });
    const threshold = Number(this.config.get('AGENT_OFFLINE_THRESHOLD_SECONDS', 120));
    return {
      id: agent.id,
      agentId: agent.agentId,
      hostname: agent.hostname,
      operatingSystem: agent.operatingSystem,
      osVersion: agent.osVersion,
      architecture: agent.architecture,
      ipAddress: agent.ipAddress,
      status: this.effectiveStatus(agent.lastSeen, threshold),
      agentVersion: agent.agentVersion,
      credentialRevokedAt: agent.credentialRevokedAt,
      firstSeen: agent.firstSeen,
      lastSeen: agent.lastSeen,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      organizationId: agent.organizationId,
      latestTelemetry: latestTelemetry.map(row => ({
        id: row.id,
        agentId: row.agentId,
        cpuUsage: row.cpuUsage,
        memoryTotal: row.memoryTotal,
        memoryUsed: row.memoryUsed,
        memoryUsage: row.memoryUsage,
        diskTotal: row.diskTotal,
        diskUsed: row.diskUsed,
        diskUsage: row.diskUsage,
        uptimeSeconds: row.uptimeSeconds,
        recordedAt: row.recordedAt,
        createdAt: row.createdAt,
      })),
    };
  }
}
