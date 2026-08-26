import { ApiProperty } from '@nestjs/swagger';

export class StatisticsDto {
  @ApiProperty({ example: 15, description: 'Total number of enrolled courses' })
  total: number;
}
