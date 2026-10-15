import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OPPORTUNITY_MODERATE_ACTION,
  type OpportunityModerateAction,
} from '@universe/core/constants/opportunities';

export class ModerateOpportunityDto {
  @ApiProperty({ enum: OPPORTUNITY_MODERATE_ACTION })
  @IsEnum(OPPORTUNITY_MODERATE_ACTION)
  action: OpportunityModerateAction;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string;
}
