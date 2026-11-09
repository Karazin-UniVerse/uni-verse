import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  OpportunityStatus,
  OpportunityTag,
  PaymentType,
} from '@universe/database';
import type { GetOpportunitiesParams } from '@universe/core/types/opportunities';
import { parseBoolean } from '@universe/core/utils/boolean';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class FindOpportunitiesDto implements GetOpportunitiesParams {
  @ApiPropertyOptional({ enum: OpportunityStatus })
  @IsEnum(OpportunityStatus)
  @IsOptional()
  status?: OpportunityStatus;

  @ApiPropertyOptional({ enum: PaymentType })
  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: OpportunityTag,
    isArray: true,
    description: 'Repeat the parameter for multiple tags',
  })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  @IsEnum(OpportunityTag, { each: true })
  @IsOptional()
  tags?: OpportunityTag[];

  @ApiPropertyOptional()
  @Transform(({ value }) => parseBoolean(value) ?? value)
  @IsBoolean()
  @IsOptional()
  isRecruiting?: boolean;
}
