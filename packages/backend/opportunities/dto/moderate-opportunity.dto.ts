import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OPPORTUNITY_MODERATE_ACTION,
  type OpportunityModerateAction,
} from '@universe/core/constants/opportunities';
import type { ModerateOpportunityRequest } from '@universe/core/types/opportunities';

export class ModerateOpportunityDto implements ModerateOpportunityRequest {
  @ApiProperty({ enum: OPPORTUNITY_MODERATE_ACTION })
  @IsEnum(OPPORTUNITY_MODERATE_ACTION)
  action: OpportunityModerateAction;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string;
}
