import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ApplyOpportunityRequest } from '@universe/core/types/opportunities';

export class ApplyOpportunityDto implements ApplyOpportunityRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  applicantName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
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
