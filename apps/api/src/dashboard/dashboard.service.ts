import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../database/entities/agent.entity';
import { Role } from '../database/entities/user.entity';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';

type DashboardPrincipal = { role: Role; organizationId: string | null };
type CountRow = { totalDevices: string | number; onlineDevices: string | number; offlineDevices: string | number };
type DistributionRow = { os?: string | null; version?: string | null; count: string | number };

@Injectable()
export class DashboardService {
  constructor(@InjectRepository(Agent) private agents: Repository<Agent>, private config: ConfigService) {}

  async summary(principal: DashboardPrincipal): Promise<DashboardSummaryResponseDto> {
    const thresholdSeconds = Number(this.config.get('AGENT_OFFLINE_THRESHOLD_SECONDS', 120));
    const cutoff = new Date(Date.now() - thresholdSeconds * 1000);
    const countsScope = this.scope(principal, 1);
    const distributionScope = this.scope(principal);

    const [counts, operatingSystems, versions] = await Promise.all([
      this.agents.query(`
        SELECT
          COUNT(*)::int AS "totalDevices",
          COUNT(*) FILTER (WHERE last_seen >= $1)::int AS "onlineDevices",
          COUNT(*) FILTER (WHERE last_seen IS NULL OR last_seen < $1)::int AS "offlineDevices"
        FROM agents
        ${countsScope.where}
      `, [cutoff, ...countsScope.parameters]),
      this.agents.query(`
        SELECT COALESCE(NULLIF(BTRIM(operating_system), ''), 'Unknown') AS os, COUNT(*)::int AS count
        FROM agents
        ${distributionScope.where}
        GROUP BY COALESCE(NULLIF(BTRIM(operating_system), ''), 'Unknown')
        ORDER BY os ASC
      `, distributionScope.parameters),
      this.agents.query(`
        SELECT COALESCE(NULLIF(BTRIM(agent_version), ''), 'Unknown') AS version, COUNT(*)::int AS count
        FROM agents
        ${distributionScope.where}
        GROUP BY COALESCE(NULLIF(BTRIM(agent_version), ''), 'Unknown')
        ORDER BY version ASC
      `, distributionScope.parameters),
    ]);

    const count = (counts[0] ?? {}) as CountRow;
    return {
      totalDevices: Number(count.totalDevices ?? 0),
      onlineDevices: Number(count.onlineDevices ?? 0),
      offlineDevices: Number(count.offlineDevices ?? 0),
      osDistribution: (operatingSystems as DistributionRow[]).map(row => ({ os: row.os ?? 'Unknown', count: Number(row.count) })),
      agentVersions: (versions as DistributionRow[]).map(row => ({ version: row.version ?? 'Unknown', count: Number(row.count) })),
    };
  }

  private scope(principal: DashboardPrincipal, parameterOffset = 0) {
    const parameters: string[] = [];
    if (principal.role === Role.SUPER_ADMIN) return { where: '', parameters };
    if (!principal.organizationId) return { where: 'WHERE 1 = 0', parameters };
    parameters.push(principal.organizationId);
    return { where: `WHERE organization_id = $${parameterOffset + 1}`, parameters };
  }
}
