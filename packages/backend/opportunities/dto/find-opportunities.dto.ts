import { ApiPropertyOptional } from '@nestjs/swagger';
import { OpportunityStatus, PaymentType } from '@universe/database';
import type { GetOpportunitiesParams } from '@universe/core/types/opportunities';
import { normalizeTags } from '@universe/core/utils/tags';
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

  @ApiPropertyOptional({ type: [String], description: 'Comma-separated' })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeTags(value.split(',')) : value,
  )
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;

    if (value === 'false' || value === false) return false;

    return value;
  })
  @IsBoolean()
  @IsOptional()
  isRecruiting?: boolean;
}
