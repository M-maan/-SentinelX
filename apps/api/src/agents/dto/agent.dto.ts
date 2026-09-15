import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, IsISO8601 } from 'class-validator';

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
