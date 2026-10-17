import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationsApi } from './api.notifications';

describe('NotificationsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMyNotifications sends GET to /notifications', async () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        userId: 'user-1',
        title: 'Title',
        message: 'Message',
        type: 'OPPORTUNITY_APPLICATION_STATUS',
        isRead: false,
        createdAt: '2025-01-01T00:00:00Z',
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockNotifications,
    } as Response);

    const response = await notificationsApi.getMyNotifications();

    expect(response.data).toEqual(mockNotifications);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/notifications');
  });
});
