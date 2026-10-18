import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notificationsApi } from './api.notifications';

describe('NotificationsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMyNotifications sends GET to /notifications', async () => {
    const mockData = [
      {
        id: 'notif-1',
        userId: 'user-1',
        type: 'OPPORTUNITY_NEW_APPLICATION',
        title: 'New application',
        message: 'Applicant applied',
        link: '/opportunities/opp-1',
        isRead: false,
        createdAt: '2026-04-18T00:00:00.000Z',
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const res = await notificationsApi.getMyNotifications();

    expect(res.data).toEqual(mockData);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/notifications');
  });

  it('markAsRead sends POST to /notifications/:id/read', async () => {
    const mockData = {
      id: 'notif-1',
      userId: 'user-1',
      type: 'OPPORTUNITY_NEW_APPLICATION',
      title: 'New application',
      message: 'Applicant applied',
      link: '/opportunities/opp-1',
      isRead: true,
      createdAt: '2026-04-18T00:00:00.000Z',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const res = await notificationsApi.markAsRead('notif-1');

    expect(res.data).toEqual(mockData);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/notifications/notif-1/read');
    expect(vi.mocked(global.fetch).mock.calls[0][1]?.method).toBe('POST');
  });

  it('markAllAsRead sends POST to /notifications/read-all', async () => {
    const mockData = { count: 3 };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const res = await notificationsApi.markAllAsRead();

    expect(res.data).toEqual(mockData);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/notifications/read-all');
    expect(vi.mocked(global.fetch).mock.calls[0][1]?.method).toBe('POST');
  });
});
