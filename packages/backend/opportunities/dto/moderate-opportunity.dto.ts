import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ModerateAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUIRE_CHANGES = 'REQUIRE_CHANGES',
}

export class ModerateOpportunityDto {
  @ApiProperty({ enum: ModerateAction })
  @IsEnum(ModerateAction)
  action: ModerateAction;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string;
}
