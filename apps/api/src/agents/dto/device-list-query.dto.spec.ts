import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DeviceListQueryDto } from './agent.dto';

describe('DeviceListQueryDto', () => {
  it('transforms valid numeric pagination values', async () => {
    const dto = plainToInstance(DeviceListQueryDto, { page: '2', limit: '100' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(100);
  });

  it('rejects invalid pagination and unsupported sort values', async () => {
    const dto = plainToInstance(DeviceListQueryDto, { page: '0', limit: '101', sortBy: 'password', sortOrder: 'sideways' });
    const errors = await validate(dto);
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['page', 'limit', 'sortBy', 'sortOrder']));
  });

  it('rejects unsupported status and overlong search values', async () => {
    const dto = plainToInstance(DeviceListQueryDto, { status: 'UNKNOWN', search: 'x'.repeat(256) });
    const errors = await validate(dto);
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['status', 'search']));
  });
});
