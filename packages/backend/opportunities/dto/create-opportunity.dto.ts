import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentType, OpportunityLifecycleState } from '@universe/database';
import type { CreateOpportunityRequest } from '@universe/core/types/opportunities';
import {
  TAG_MAX_LENGTH,
  TAG_MAX_PER_OPPORTUNITY,
} from '@universe/core/constants/tags';
import { normalizeTags } from '@universe/core/utils/tags';

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

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  acceptsApplications?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @Transform(({ value }) =>
    Array.isArray(value) ? normalizeTags(value) : value,
  )
  @IsArray()
  @ArrayMaxSize(TAG_MAX_PER_OPPORTUNITY)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(TAG_MAX_LENGTH, { each: true })
  @IsOptional()
  tags?: string[];
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
