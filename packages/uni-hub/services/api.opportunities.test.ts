import { describe, it, expect, vi, beforeEach } from 'vitest';
import { opportunitiesApi } from './api.opportunities';
import type {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  ApplyOpportunityDto,
} from './api.opportunities';

describe('OpportunitiesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getOpportunities should request /opportunities with serialized query string', async () => {
    const mockData = [{ id: '1', title: 'Test Opp' }];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const res = await opportunitiesApi.getOpportunities({
      status: 'PUBLISHED',
      paymentType: 'PAID',
    });

    expect(res.data).toEqual(mockData);
    const fetchMock = vi.mocked(global.fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/opportunities?status=OPEN&paymentType=PAID');
  });

  it('getOpportunity should request /opportunities/:id', async () => {
    const mockData = { id: '1', title: 'Test Opp' };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const res = await opportunitiesApi.getOpportunity('1');

    expect(res.data).toEqual(mockData);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/opportunities/1');
  });

  it('createOpportunity should send POST to /opportunities', async () => {
    const mockData = { id: '1', title: 'New Opp' };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const dto: CreateOpportunityDto = {
      title: 'New Opp',
      description: 'Desc',
      ownerContactInfo: 'test@example.com',
      paymentType: 'PAID',
    };

    const res = await opportunitiesApi.createOpportunity(dto);

    expect(res.data).toEqual(mockData);
    const call = vi.mocked(global.fetch).mock.calls[0];

    expect(call[0]).toContain('/opportunities');
    expect(call[1]?.method).toBe('POST');
    expect(call[1]?.body).toBe(JSON.stringify(dto));
  });

  it('updateOpportunity should send PUT to /opportunities/:id', async () => {
    const mockData = { id: '1', title: 'Updated Opp' };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const dto: UpdateOpportunityDto = { title: 'Updated Opp' };
    const res = await opportunitiesApi.updateOpportunity('1', dto);

    expect(res.data).toEqual(mockData);
    const call = vi.mocked(global.fetch).mock.calls[0];

    expect(call[0]).toContain('/opportunities/1');
    expect(call[1]?.method).toBe('PUT');
    expect(call[1]?.body).toBe(JSON.stringify(dto));
  });

  it('changeStatus should send POST to /opportunities/:id/status', async () => {
    const mockData = { id: '1', title: 'Opp' };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const res = await opportunitiesApi.changeStatus('1', 'READY_FOR_REVIEW');

    expect(res.data).toEqual(mockData);
    const call = vi.mocked(global.fetch).mock.calls[0];

    expect(call[0]).toContain('/opportunities/1/status');
    expect(call[1]?.method).toBe('POST');
    expect(call[1]?.body).toBe(JSON.stringify({ status: 'READY_FOR_REVIEW' }));
  });

  it('changeLifecycle should send PUT to /opportunities/:id/lifecycle', async () => {
    const mockData = { id: '1' };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const res = await opportunitiesApi.changeLifecycle('1', 'ACTIVE');

    expect(res.data).toEqual(mockData);
    const call = vi.mocked(global.fetch).mock.calls[0];

    expect(call[0]).toContain('/opportunities/1/lifecycle');
    expect(call[1]?.method).toBe('PUT');
    expect(call[1]?.body).toBe(JSON.stringify({ lifecycleState: 'ACTIVE' }));
  });

  it('apply should send POST to /opportunities/:id/apply', async () => {
    const mockData = { id: 'app1' };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const dto: ApplyOpportunityDto = {
      applicantName: 'Test Student',
      contactInfo: 'test@student.karazin.ua',
    };

    const res = await opportunitiesApi.apply('1', dto);

    expect(res.data).toEqual(mockData);
    const call = vi.mocked(global.fetch).mock.calls[0];

    expect(call[0]).toContain('/opportunities/1/apply');
    expect(call[1]?.method).toBe('POST');
    expect(call[1]?.body).toBe(JSON.stringify(dto));
  });

  it('moderate should send POST to /opportunities/:id/moderate', async () => {
    const mockData = { id: '1' };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const res = await opportunitiesApi.moderate('1', 'APPROVE', 'Looks good');

    expect(res.data).toEqual(mockData);
    const call = vi.mocked(global.fetch).mock.calls[0];

    expect(call[0]).toContain('/opportunities/1/moderate');
    expect(call[1]?.method).toBe('POST');
    expect(call[1]?.body).toBe(JSON.stringify({ action: 'APPROVE', comment: 'Looks good' }));
  });

  it('withdrawApplication should send PUT to withdraw endpoint', async () => {
    const mockData = { id: 'app1' };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const res = await opportunitiesApi.withdrawApplication('app1');

    expect(res.data).toEqual(mockData);
    const call = vi.mocked(global.fetch).mock.calls[0];

    expect(call[0]).toContain('/opportunities/my/applications/app1/withdraw');
    expect(call[1]?.method).toBe('PUT');
  });

  it('various getters should query their respective endpoints', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    await opportunitiesApi.getMyOpportunities();
    await opportunitiesApi.getOpportunityApplications('1');
    await opportunitiesApi.getMyApplications();
    await opportunitiesApi.getAdminUsers();

    const fetchMock = vi.mocked(global.fetch);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0][0]).toContain('/opportunities/my');
    expect(fetchMock.mock.calls[1][0]).toContain('/opportunities/1/applications');
    expect(fetchMock.mock.calls[2][0]).toContain('/opportunities/my/applications');
    expect(fetchMock.mock.calls[3][0]).toContain('/admin/users');
  });
});
