import { ApiProperty } from '@nestjs/swagger';
import { OpportunityLifecycleState } from '@universe/database';
import { IsEnum } from 'class-validator';
import type { ChangeLifecycleStateRequest } from '@universe/core/types/opportunities';

export class ChangeLifecycleStateDto implements ChangeLifecycleStateRequest {
  @ApiProperty({ enum: OpportunityLifecycleState })
  @IsEnum(OpportunityLifecycleState)
  lifecycleState: OpportunityLifecycleState;
}
