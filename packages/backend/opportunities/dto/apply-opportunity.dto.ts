import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ApplyOpportunityRequest } from '@universe/core/types/opportunities';
import { IsContactInfoConstraint } from '../opportunities.helpers';

export class ApplyOpportunityDto implements ApplyOpportunityRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  applicantName: string;

  @ApiPropertyOptional()
  @IsString()
  @ValidateIf(
    (dto: ApplyOpportunityDto): boolean =>
      dto.contactInfo !== undefined && dto.contactInfo !== '',
  )
  @Validate(IsContactInfoConstraint)
  contactInfo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  briefDescription?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  motivation?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  answers?: string;
}
