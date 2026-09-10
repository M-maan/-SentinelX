import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('agent_telemetry')
export class AgentTelemetry {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'agent_id', type: 'uuid' }) agentId!: string;
  @Column({ name: 'cpu_usage', type: 'double precision' }) cpuUsage!: number;
  @Column({ name: 'memory_total', type: 'bigint' }) memoryTotal!: number;
  @Column({ name: 'memory_used', type: 'bigint' }) memoryUsed!: number;
  @Column({ name: 'memory_usage', type: 'double precision' }) memoryUsage!: number;
  @Column({ name: 'disk_total', type: 'bigint' }) diskTotal!: number;
  @Column({ name: 'disk_used', type: 'bigint' }) diskUsed!: number;
  @Column({ name: 'disk_usage', type: 'double precision' }) diskUsage!: number;
  @Column({ name: 'uptime_seconds', type: 'bigint' }) uptimeSeconds!: number;
  @Column({ name: 'recorded_at', type: 'timestamptz' }) recordedAt!: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
