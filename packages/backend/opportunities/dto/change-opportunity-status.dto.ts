import { ApiProperty } from '@nestjs/swagger';
import { OpportunityStatus } from '@universe/database';
import { IsIn } from 'class-validator';

export class ChangeOpportunityStatusDto {
  @ApiProperty({ enum: [OpportunityStatus.READY_FOR_REVIEW] })
  @IsIn([OpportunityStatus.READY_FOR_REVIEW])
  status: OpportunityStatus;
}
