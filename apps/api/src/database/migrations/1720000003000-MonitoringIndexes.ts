import { MigrationInterface, QueryRunner } from 'typeorm';

export class MonitoringIndexes1720000003000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query('CREATE INDEX "IDX_agents_hostname" ON "agents" ("hostname")');
    await q.query('CREATE INDEX "IDX_agents_operating_system" ON "agents" ("operating_system")');
    await q.query('CREATE INDEX "IDX_agents_agent_version" ON "agents" ("agent_version")');
    await q.query('CREATE INDEX "IDX_agents_last_seen" ON "agents" ("last_seen" DESC)');
    await q.query('CREATE INDEX "IDX_agent_telemetry_recorded_at" ON "agent_telemetry" ("recorded_at" DESC)');
    await q.query('CREATE INDEX "IDX_agent_telemetry_agent_recorded" ON "agent_telemetry" ("agent_id", "recorded_at" DESC)');
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP INDEX "IDX_agent_telemetry_agent_recorded"');
    await q.query('DROP INDEX "IDX_agent_telemetry_recorded_at"');
    await q.query('DROP INDEX "IDX_agents_last_seen"');
    await q.query('DROP INDEX "IDX_agents_agent_version"');
    await q.query('DROP INDEX "IDX_agents_operating_system"');
    await q.query('DROP INDEX "IDX_agents_hostname"');
  }
}
