import { AgentsService } from './agents.service';
import { AgentStatus } from '../database/entities/agent.entity';
import { DeviceSortBy, SortOrder } from './dto/agent.dto';

describe('AgentsService device listing', () => {
  const config = { get: jest.fn().mockReturnValue(120) } as any;
  const builder = {
    andWhere: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };
  const repository = { createQueryBuilder: jest.fn(() => builder) } as any;
  let service: AgentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue(120);
    builder.getManyAndCount.mockResolvedValue([[], 0]);
    service = new AgentsService(repository, {} as any, {} as any, config);
  });

  it('uses compatible defaults and returns empty pagination correctly', async () => {
    await expect(service.list({ role: 'VIEWER' as any, organizationId: 'org-a' })).resolves.toEqual({ items: [], page: 1, limit: 20, total: 0, totalPages: 0 });
    expect(builder.skip).toHaveBeenCalledWith(0);
    expect(builder.take).toHaveBeenCalledWith(20);
  });

  it('paginates at the database and calculates total pages', async () => {
    builder.getManyAndCount.mockResolvedValue([[{ id: 'a', lastSeen: new Date(), credentialHash: undefined }], 41]);

    const result = await service.list({ role: 'VIEWER' as any, organizationId: 'org-a' }, { page: 3, limit: 20 });

    expect(result.page).toBe(3);
    expect(result.limit).toBe(20);
    expect(result.total).toBe(41);
    expect(result.totalPages).toBe(3);
    expect(builder.skip).toHaveBeenCalledWith(40);
    expect(builder.take).toHaveBeenCalledWith(20);
  });

  it('applies organization, search, and all supported filters together', async () => {
    await service.list({ role: 'ANALYST' as any, organizationId: 'org-a' }, { status: AgentStatus.ONLINE, os: 'Linux', agentVersion: '1.2.3', hostname: 'host-1', search: '100%_ready' });

    const whereCalls = builder.andWhere.mock.calls.map(([sql]) => sql as string);
    expect(whereCalls).toEqual(expect.arrayContaining([
      'agent.organization_id = :org',
      'agent.last_seen IS NOT NULL AND agent.last_seen >= :cutoff',
      'LOWER(agent.operating_system) = LOWER(:os)',
      'LOWER(agent.agent_version) = LOWER(:agentVersion)',
      'LOWER(agent.hostname) = LOWER(:hostname)',
      expect.stringContaining('agent.hostname ILIKE :search'),
    ]));
    expect(builder.andWhere.mock.calls.find(([sql]) => String(sql).includes('ILIKE'))?.[1]).toEqual({ search: '%100\\%\\_ready%' });
  });

  it('uses heartbeat cutoff for offline filtering instead of persisted status', async () => {
    await service.list({ role: 'VIEWER' as any, organizationId: 'org-a' }, { status: AgentStatus.OFFLINE });

    expect(builder.andWhere).toHaveBeenCalledWith('(agent.last_seen IS NULL OR agent.last_seen < :cutoff)');
    expect(builder.setParameter).toHaveBeenCalledWith('cutoff', expect.any(Date));
  });

  it.each([
    [DeviceSortBy.LAST_SEEN, 'agent.last_seen', 'DESC'],
    [DeviceSortBy.HOSTNAME, 'agent.hostname', 'ASC'],
    [DeviceSortBy.STATUS, expect.stringContaining('CASE WHEN agent.last_seen'), 'DESC'],
    [DeviceSortBy.RECENTLY_ACTIVE, expect.stringContaining('CASE WHEN agent.last_seen'), 'ASC'],
  ])('whitelists %s sorting and adds a deterministic id tie-breaker', async (sortBy, expression, direction) => {
    await service.list({ role: 'VIEWER' as any, organizationId: 'org-a' }, { sortBy, sortOrder: direction === 'ASC' ? SortOrder.ASC : SortOrder.DESC });

    expect(builder.orderBy).toHaveBeenCalledWith(expression, direction, ...(sortBy === DeviceSortBy.LAST_SEEN ? ['NULLS LAST'] : []));
    if (sortBy === DeviceSortBy.RECENTLY_ACTIVE) expect(builder.addOrderBy).toHaveBeenCalledWith('agent.last_seen', direction, 'NULLS LAST');
    expect(builder.addOrderBy).toHaveBeenCalledWith('agent.id', 'ASC');
  });

  it('does not add an organization predicate for the existing Super Admin global scope', async () => {
    await service.list({ role: 'SUPER_ADMIN' as any, organizationId: null }, { page: 1, limit: 100 });

    expect(builder.andWhere).not.toHaveBeenCalledWith('agent.organization_id = :org', expect.anything());
    expect(builder.take).toHaveBeenCalledWith(100);
  });
});
