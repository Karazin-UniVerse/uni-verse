import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({ example: 'assignment.pdf' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    example:
      'JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPU',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(data:.*?;base64,)?[A-Za-z0-9+/=]+$/, {
    message: 'filebase64 must be a valid base64 or data URL base64 string',
  })
  filebase64: string;
}
