import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, IsISO8601 } from 'class-validator';
import { AgentStatus } from '../../database/entities/agent.entity';

export class EnrollAgentDto {
  @IsString() @IsNotEmpty() agentId!: string;
  @IsString() @IsNotEmpty() hostname!: string;
  @IsString() @IsNotEmpty() operatingSystem!: string;
  @IsString() @IsNotEmpty() osVersion!: string;
  @IsString() @IsNotEmpty() architecture!: string;
  @IsString() @IsNotEmpty() agentVersion!: string;
  @IsString() @IsNotEmpty() enrollmentToken!: string;
}

export class HeartbeatDto { @IsOptional() @IsString() agentVersion?: string; }

export enum DeviceSortBy { LAST_SEEN = 'lastSeen', HOSTNAME = 'hostname', STATUS = 'status', RECENTLY_ACTIVE = 'recentlyActive' }
export enum SortOrder { ASC = 'asc', DESC = 'desc' }

export class DeviceListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsEnum(AgentStatus) status?: AgentStatus;
  @IsOptional() @IsString() @MaxLength(80) os?: string;
  @IsOptional() @IsString() @MaxLength(80) agentVersion?: string;
  @IsOptional() @IsString() @MaxLength(255) hostname?: string;
  @IsOptional() @IsString() @MaxLength(255) search?: string;
  @IsOptional() @IsEnum(DeviceSortBy) sortBy?: DeviceSortBy;
  @IsOptional() @IsEnum(SortOrder) sortOrder?: SortOrder;
}

export class TelemetryDto {
  @IsISO8601() timestamp!: string;
  @IsNumber() @Min(0) @Max(100) cpuUsagePercent!: number;
  @IsInt() @Min(0) memoryTotalBytes!: number;
  @IsInt() @Min(0) memoryUsedBytes!: number;
  @IsNumber() @Min(0) @Max(100) memoryUsagePercent!: number;
  @IsInt() @Min(0) diskTotalBytes!: number;
  @IsInt() @Min(0) diskUsedBytes!: number;
  @IsNumber() @Min(0) @Max(100) diskUsagePercent!: number;
  @IsInt() @Min(0) uptimeSeconds!: number;
}
