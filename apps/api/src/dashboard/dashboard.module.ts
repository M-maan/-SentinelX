import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Agent } from '../database/entities/agent.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Agent])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
