import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyOpportunityDto {
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
