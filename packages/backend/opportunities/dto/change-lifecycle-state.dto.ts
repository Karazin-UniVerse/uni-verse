import { ApiProperty } from '@nestjs/swagger';
import { OpportunityLifecycleState } from '@universe/database';
import { IsEnum } from 'class-validator';

export class ChangeLifecycleStateDto {
  @ApiProperty({ enum: OpportunityLifecycleState })
  @IsEnum(OpportunityLifecycleState)
  lifecycleState: OpportunityLifecycleState;
}
