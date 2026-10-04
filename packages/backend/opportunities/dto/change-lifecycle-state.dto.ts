import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum OpportunityLifecycleState {
  START = 'START',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class ChangeLifecycleStateDto {
  @ApiProperty({ enum: OpportunityLifecycleState })
  @IsEnum(OpportunityLifecycleState)
  lifecycleState: OpportunityLifecycleState;
}
