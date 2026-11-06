import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type {
  GripBrowserLoginRequest,
  GripBrowserCallbackRequest,
} from '@universe/core/types/grip-hosted';

export class GripBrowserLoginDto implements GripBrowserLoginRequest {
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  browserBinding!: string;

  @Matches(/^[A-Za-z0-9_-]{43}$/)
  returnCheckId!: string;
}

export class GripBrowserCallbackDto implements GripBrowserCallbackRequest {
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  browserBinding!: string;

  @Matches(/^[A-Za-z0-9_-]{43}$/)
  state!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  code!: string;

  @IsOptional()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  previousSession?: string;
}
