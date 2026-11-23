import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type CreateNotificationParams = {
  userId: string;
  title: string;
  message: string;
  link?: string;
  type?: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification({
    userId,
    title,
    message,
    link,
    type,
  }: CreateNotificationParams) {
    return this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        link,
        type,
      },
    });
  }

  async createNotifications(
    notifications: CreateNotificationParams[],
  ): Promise<{ count: number }> {
    if (notifications.length === 0) {
      return { count: 0 };
    }

    return this.prisma.notification.createMany({
      data: notifications.map(({ userId, title, message, link, type }) => ({
        userId,
        title,
        message,
        link,
        type,
      })),
    });
  }

  async getMyNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
