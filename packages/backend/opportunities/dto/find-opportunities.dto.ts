import { ApiPropertyOptional } from '@nestjs/swagger';
import { OpportunityStatus, PaymentType } from '@universe/database';
import type { GetOpportunitiesParams } from '@universe/core/types/opportunities';
import { IsEnum, IsOptional, IsString } from 'class-validator';

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
}
