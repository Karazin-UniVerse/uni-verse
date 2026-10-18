import { request } from './api.request';

export interface PlatformNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type?: string | null;
  link?: string | null;
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
