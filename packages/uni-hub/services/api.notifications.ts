import { request } from './api.request';

export interface PlatformNotification {
  id: string;
  type?: string | null;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
  userId: string;
}

export class NotificationsApi {
  async getMyNotifications(): Promise<{ data: PlatformNotification[] }> {
    return request<PlatformNotification[]>('/notifications');
  }
}

export const notificationsApi = new NotificationsApi();
