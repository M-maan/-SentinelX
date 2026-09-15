import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgentLifecycle1720000002000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE "organizations" ADD COLUMN "enrollment_token_expires_at" timestamptz');
    await q.query('ALTER TABLE "organizations" ADD COLUMN "enrollment_token_revoked_at" timestamptz');
    await q.query('ALTER TABLE "agents" ADD COLUMN "credential_revoked_at" timestamptz');
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE "agents" DROP COLUMN "credential_revoked_at"');
    await q.query('ALTER TABLE "organizations" DROP COLUMN "enrollment_token_revoked_at"');
    await q.query('ALTER TABLE "organizations" DROP COLUMN "enrollment_token_expires_at"');
  }
}
