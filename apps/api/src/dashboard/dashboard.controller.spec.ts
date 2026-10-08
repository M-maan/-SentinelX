import { DashboardController } from './dashboard.controller';
import { Role } from '../database/entities/user.entity';

describe('DashboardController', () => {
  it('passes the authenticated principal to the dashboard service', async () => {
    const summary = jest.fn().mockResolvedValue({ totalDevices: 0 });
    const controller = new DashboardController({ summary } as any);
    const user = { role: Role.VIEWER, organizationId: 'org-a' };

    await expect(controller.summary({ user } as any)).resolves.toEqual({ totalDevices: 0 });
    expect(summary).toHaveBeenCalledWith(user);
  });
});
