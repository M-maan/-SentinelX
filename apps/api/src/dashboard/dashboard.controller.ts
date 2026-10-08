import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../database/entities/user.entity';
import { DashboardService } from './dashboard.service';

type UserRequest = Request & { user: { role: Role; organizationId: string | null } };

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.SECURITY_ADMIN, Role.ANALYST, Role.VIEWER)
  summary(@Req() req: UserRequest) {
    return this.dashboard.summary(req.user);
  }
}
