import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentType, OpportunityLifecycleState } from '@universe/database';
import type { CreateOpportunityRequest } from '@universe/core/types/opportunities';

export class CreateOpportunityDto implements CreateOpportunityRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional()
  @IsString()
  @ValidateIf(
    (dto: CreateOpportunityDto): boolean => dto.ownerContactInfo !== undefined,
  )
  ownerContactInfo?: string;

  @ApiProperty({ enum: PaymentType, default: PaymentType.UNPAID })
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  paymentDetails?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  acceptsApplications?: boolean;

  @ApiPropertyOptional({
    enum: OpportunityLifecycleState,
    default: OpportunityLifecycleState.START,
  })
  @IsEnum(OpportunityLifecycleState)
  @ValidateIf(
    (dto: CreateOpportunityDto): boolean => dto.lifecycleState !== undefined,
  )
  lifecycleState?: OpportunityLifecycleState;
}
