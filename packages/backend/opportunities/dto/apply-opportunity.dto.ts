import { IsNotEmpty, IsOptional, IsString, Validate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsContactInfoConstraint } from '../opportunities.helpers';

export class ApplyOpportunityDto {
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
