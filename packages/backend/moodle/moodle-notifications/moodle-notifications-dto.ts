import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  Notification,
  NotificationsResponse,
} from '@universe/core/types/moodle';

export class NotificationDto implements Notification {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Subject' })
  subject: string;

  @ApiPropertyOptional({ example: 'Full message' })
  fullmessage?: string;

  @ApiProperty({ example: 1672531200 })
  timecreated: number;

  @ApiProperty({ example: false })
  read: boolean;
}

export class NotificationsResponseDto implements NotificationsResponse {
  @ApiProperty({ type: [NotificationDto] })
  notifications: NotificationDto[];

  @ApiProperty({ example: 5 })
  unreadcount: number;
}
