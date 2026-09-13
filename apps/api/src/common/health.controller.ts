import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}
  @Get()
  async check() {
    let database: 'up' | 'down' = 'up';
    try { await this.dataSource.query('SELECT 1'); } catch { database = 'down'; }
    return { status: database === 'up' ? 'ok' : 'degraded', database, timestamp: new Date().toISOString() };
  }
}
