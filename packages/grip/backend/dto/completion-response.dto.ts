import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  GripCompletionChoice,
  GripCompletionChoiceMessage,
  GripCompletionResponse,
  GripCompletionUsage,
} from '@universe/core/types/grip';

export class GripCompletionChoiceMessageDto implements GripCompletionChoiceMessage {
  @ApiProperty({ example: 'assistant' })
  role: 'assistant';

  @ApiProperty()
  content: string;
}

export class GripCompletionChoiceDto implements GripCompletionChoice {
  @ApiProperty({ type: () => GripCompletionChoiceMessageDto })
  message: GripCompletionChoiceMessageDto;

  @ApiPropertyOptional()
  index?: number;

  @ApiPropertyOptional()
  finish_reason?: string;
}

export class GripCompletionUsageDto implements GripCompletionUsage {
  @ApiPropertyOptional()
  prompt_tokens?: number;

  @ApiPropertyOptional()
  completion_tokens?: number;

  @ApiPropertyOptional()
  total_tokens?: number;
}

export class GripCompletionResponseDto implements GripCompletionResponse {
  @ApiProperty({ type: () => [GripCompletionChoiceDto] })
  choices: GripCompletionChoiceDto[];

  @ApiPropertyOptional({ type: () => GripCompletionUsageDto })
  usage?: GripCompletionUsageDto;
}
