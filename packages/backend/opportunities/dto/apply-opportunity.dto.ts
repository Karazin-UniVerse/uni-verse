import { IsNotEmpty, IsOptional, IsString, Validate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ApplyOpportunityRequest } from '@universe/core/types/opportunities';
import { IsContactInfoConstraint } from '../opportunities.helpers';

export class ApplyOpportunityDto implements ApplyOpportunityRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  applicantName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Validate(IsContactInfoConstraint)
  contactInfo: string;

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
