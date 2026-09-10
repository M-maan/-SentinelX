import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; import { OrganizationAccessGuard } from '../auth/organization-access.guard'; import { Roles } from '../auth/roles.decorator'; import { RolesGuard } from '../auth/roles.guard'; import { Role } from '../database/entities/user.entity'; import { Agent, AgentStatus } from '../database/entities/agent.entity';
import { AgentAuthGuard } from './agent-auth.guard'; import { AgentsService } from './agents.service'; import { EnrollAgentDto, HeartbeatDto, TelemetryDto } from './dto/agent.dto';
type UserRequest = Request & { user: { role: Role; organizationId: string | null }; agent: Agent };
@Controller({ path: 'agents', version: '1' }) export class AgentsController {
  constructor(private agents: AgentsService) {}
  @Post('enroll') enroll(@Body() dto: EnrollAgentDto) { return this.agents.enroll(dto); }
  @Post('heartbeat') @UseGuards(AgentAuthGuard) heartbeat(@Req() req: UserRequest, @Body() dto: HeartbeatDto) { return this.agents.heartbeat(req.agent, dto.agentVersion, req.ip); }
  @Post('telemetry') @UseGuards(AgentAuthGuard) telemetry(@Req() req: UserRequest, @Body() dto: TelemetryDto) { return this.agents.recordTelemetry(req.agent, dto); }
  @Post('enrollment-token') @UseGuards(JwtAuthGuard, RolesGuard, OrganizationAccessGuard) @Roles(Role.SUPER_ADMIN, Role.SECURITY_ADMIN) enrollmentToken(@Req() req: UserRequest) { if (!req.user.organizationId) throw new Error('Organization required'); return this.agents.createEnrollmentToken(req.user.organizationId); }
  @Get() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.SUPER_ADMIN, Role.SECURITY_ADMIN, Role.ANALYST, Role.VIEWER) list(@Req() req: UserRequest, @Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: AgentStatus) { return this.agents.list(req.user, Math.max(1, Number(page ?? 1)), Math.min(100, Math.max(1, Number(limit ?? 25))), status); }
  @Get(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.SUPER_ADMIN, Role.SECURITY_ADMIN, Role.ANALYST, Role.VIEWER) detail(@Req() req: UserRequest, @Param('id') id: string) { return this.agents.detail(req.user, id); }
}
