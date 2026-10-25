import { ApiClient } from './api.request';

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

export class NotificationsApi extends ApiClient {
  async getMyNotifications(): Promise<{ data: PlatformNotification[] }> {
    return this.request<PlatformNotification[]>('/notifications');
  }

  async markAsRead(id: string): Promise<{ data: PlatformNotification }> {
    return this.request<PlatformNotification>(`/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  async markAllAsRead(): Promise<{ data: MarkAllAsReadResponse }> {
    return this.request<MarkAllAsReadResponse>('/notifications/read-all', {
      method: 'POST',
    });
  }
}

export const notificationsApi = new NotificationsApi();
