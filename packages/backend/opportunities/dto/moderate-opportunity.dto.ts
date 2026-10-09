import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const ModerateAction = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  REQUIRE_CHANGES: 'REQUIRE_CHANGES',
} as const;

export type ModerateAction =
  (typeof ModerateAction)[keyof typeof ModerateAction];

export class ModerateOpportunityDto {
  @ApiProperty({ enum: ModerateAction })
  @IsEnum(ModerateAction)
  action: ModerateAction;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string;
}
