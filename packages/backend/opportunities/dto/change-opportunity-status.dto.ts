import { ApiProperty } from '@nestjs/swagger';
import { OpportunityStatus } from '@universe/database';
import { IsIn } from 'class-validator';
import type { ChangeOpportunityStatusRequest } from '@universe/core/types/opportunities';

export class ChangeOpportunityStatusDto implements ChangeOpportunityStatusRequest {
  @ApiProperty({ enum: [OpportunityStatus.READY_FOR_REVIEW] })
  @IsIn([OpportunityStatus.READY_FOR_REVIEW])
  status: OpportunityStatus;
}
