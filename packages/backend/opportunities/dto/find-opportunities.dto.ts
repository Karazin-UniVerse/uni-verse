import { ApiPropertyOptional } from '@nestjs/swagger';
import { OpportunityStatus, PaymentType } from '@universe/database';
import type { GetOpportunitiesParams } from '@universe/core/types/opportunities';
import { parseBoolean } from '@universe/core/utils/boolean';
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

  @ApiPropertyOptional({
    type: [String],
    description: 'Repeat tags for multiple names; commas are part of a name',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') return normalizeTags([value]);

    if (Array.isArray(value) && value.every((tag) => typeof tag === 'string')) {
      return normalizeTags(value);
    }

    return value;
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @Transform(({ value }) => parseBoolean(value) ?? value)
  @IsBoolean()
  @IsOptional()
  isRecruiting?: boolean;
}
