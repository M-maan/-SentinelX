import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum AgentStatus { ONLINE = 'ONLINE', OFFLINE = 'OFFLINE' }

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'organization_id', type: 'uuid' }) organizationId!: string;
  @Index() @Column({ name: 'agent_id', length: 160, unique: true }) agentId!: string;
  @Column({ length: 255 }) hostname!: string;
  @Column({ name: 'operating_system', length: 80 }) operatingSystem!: string;
  @Column({ name: 'os_version', length: 160 }) osVersion!: string;
  @Column({ length: 80 }) architecture!: string;
  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true }) ipAddress!: string | null;
  @Column({ type: 'enum', enum: AgentStatus, default: AgentStatus.OFFLINE }) status!: AgentStatus;
  @Column({ name: 'agent_version', length: 80 }) agentVersion!: string;
  @Column({ name: 'credential_hash', length: 128, select: false }) credentialHash!: string;
  @CreateDateColumn({ name: 'first_seen' }) firstSeen!: Date;
  @Column({ name: 'last_seen', type: 'timestamptz', nullable: true }) lastSeen!: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
