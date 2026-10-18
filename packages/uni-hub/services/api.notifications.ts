import { request } from './api.request';

export interface PlatformNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface MarkAllAsReadResponse {
  count: number;
}

export class NotificationsApi {
  async getMyNotifications(): Promise<{ data: PlatformNotification[] }> {
    return request<PlatformNotification[]>('/notifications');
  }

  async markAsRead(id: string): Promise<{ data: PlatformNotification }> {
    return request<PlatformNotification>(`/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  async markAllAsRead(): Promise<{ data: MarkAllAsReadResponse }> {
    return request<MarkAllAsReadResponse>('/notifications/read-all', {
      method: 'POST',
    });
  }
}

export const notificationsApi = new NotificationsApi();
