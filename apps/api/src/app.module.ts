import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AgentsModule } from './agents/agents.module';
import { HealthController } from './common/health.controller';
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, cache: true, validationSchema: Joi.object({ NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'), PORT: Joi.number().port().default(3001), DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(), JWT_SECRET: Joi.string().min(32).required(), JWT_REFRESH_SECRET: Joi.string().min(32).required(), REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).required(), WEB_ORIGIN: Joi.string().uri().default('http://localhost:3000'), API_URL: Joi.string().uri().optional(), AGENT_OFFLINE_THRESHOLD_SECONDS: Joi.number().integer().min(30).default(120) }) }), ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]), DatabaseModule, AuthModule, UsersModule, OrganizationsModule, AgentsModule], controllers: [HealthController] })
export class AppModule {}
