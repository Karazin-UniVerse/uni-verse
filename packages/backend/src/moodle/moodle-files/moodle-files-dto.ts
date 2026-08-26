import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

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
  filebase64: string;
}
