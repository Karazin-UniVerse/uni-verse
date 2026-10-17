import { request } from './api.request';

export interface PlatformNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  userId: string;
  type?: string | null;
  link?: string | null;
}

export class NotificationsApi {
  async getMyNotifications(): Promise<{ data: PlatformNotification[] }> {
    return request<PlatformNotification[]>('/notifications');
  }
}

export const notificationsApi = new NotificationsApi();
