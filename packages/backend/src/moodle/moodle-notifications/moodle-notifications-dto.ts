import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationDto {
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

export class NotificationsResponseDto {
  @ApiProperty({ type: [NotificationDto] })
  notifications: NotificationDto[];

  @ApiProperty({ example: 5 })
  unreadcount: number;
}
