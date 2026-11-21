import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OpportunityLifecycleState,
  OpportunityTag,
  PaymentType,
} from '@universe/database';
import type { CreateOpportunityRequest } from '@universe/core/types/opportunities';
import { IsContactInfoConstraint } from '../opportunities.helpers';

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
  @Validate(IsContactInfoConstraint)
  ownerContactInfo?: string;

  @ApiProperty({ enum: PaymentType, default: PaymentType.UNPAID })
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  paymentDetails?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  acceptsApplications?: boolean;

  @ApiPropertyOptional({ enum: OpportunityTag, isArray: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? [...new Set(value)] : value,
  )
  @IsArray()
  @IsEnum(OpportunityTag, { each: true })
  @IsOptional()
  tags?: OpportunityTag[];

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
