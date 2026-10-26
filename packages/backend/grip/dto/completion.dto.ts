import { ApiProperty } from '@nestjs/swagger';
import type {
  GripCompletionRequest,
  GripMessage,
  GripResponseFormat,
} from '@universe/core/types/grip';
import { IsArray, IsNotEmpty, IsObject, IsString } from 'class-validator';

export class GripCompletionDto implements GripCompletionRequest {
  @ApiProperty({ example: 'gemini-3.5-flash-lite' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({
    example: [
      { role: 'system', content: 'You are Grip.' },
      { role: 'user', content: 'Generate questions.' },
    ],
  })
  @IsArray()
  messages: [GripMessage, GripMessage];

  @ApiProperty({
    example: {
      type: 'json_schema',
      json_schema: {
        name: 'Board',
        schema: {},
      },
    },
  })
  @IsObject()
  response_format: GripResponseFormat;
}
