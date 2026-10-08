import { MigrationInterface, QueryRunner } from 'typeorm';

export class MonitoringIndexes1720000003000 implements MigrationInterface {
  name = 'MonitoringIndexes1720000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX "IDX_agents_credential_hash" ON "agents" ("credential_hash")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_agents_organization_last_seen" ON "agents" ("organization_id", "last_seen" DESC NULLS LAST)',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_agent_telemetry_agent_recorded_at" ON "agent_telemetry" ("agent_id", "recorded_at" DESC)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_agent_telemetry_agent_recorded_at"');
    await queryRunner.query('DROP INDEX "IDX_agents_organization_last_seen"');
    await queryRunner.query('DROP INDEX "IDX_agents_credential_hash"');
  }
}
