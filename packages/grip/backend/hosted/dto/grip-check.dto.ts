import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
  IsDefined,
  IsISO8601,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type {
  GripAnswer,
  GripCreateCheckRequest,
  GripPushManifest,
  GripPushUpdate,
  GripSubmissionRequest,
} from '@universe/core/types/grip-hosted';
import { GRIP_HOSTED_POLICY } from '@universe/core/constants/grip-hosted';

class GripPushUpdateDto implements GripPushUpdate {
  @IsString()
  @MaxLength(256)
  @Matches(/^(?:refs\/[A-Za-z0-9_./-]+|HEAD|\(delete\)|[a-f0-9]{40}|[a-f0-9]{64})$/)
  localRef!: string;

  @Matches(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/)
  localOid!: string;

  @IsString()
  @MaxLength(256)
  @Matches(/^refs\/[A-Za-z0-9_./-]+$/)
  remoteRef!: string;

  @Matches(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/)
  remoteOid!: string;
}

class GripPushManifestDto implements GripPushManifest {
  @Equals('Karazin-UniVerse/uni-verse')
  repository!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(GRIP_HOSTED_POLICY.MAX_UPDATES)
  @ArrayUnique((update: GripPushUpdateDto) => update.remoteRef)
  @ValidateNested({ each: true })
  @Type(() => GripPushUpdateDto)
  updates!: GripPushUpdateDto[];

  @Equals(GRIP_HOSTED_POLICY.VERSION)
  policyVersion!: string;

  @Matches(/^[a-f0-9]{64}$/)
  diffDigest!: string;
}

export class GripCreateCheckDto implements GripCreateCheckRequest {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{16,128}$/)
  requestId!: string;

  @IsISO8601({ strict: true })
  intentCreatedAt!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => GripPushManifestDto)
  manifest!: GripPushManifestDto;

  @IsString()
  @MinLength(1)
  @MaxLength(GRIP_HOSTED_POLICY.MAX_DIFF_BYTES)
  diff!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(GRIP_HOSTED_POLICY.MAX_FILES)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(1_024, { each: true })
  files!: string[];

  @IsBoolean()
  truncated!: boolean;
}

class GripAnswerDto implements GripAnswer {
  @Matches(/^q[1-5]$/)
  questionId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(GRIP_HOSTED_POLICY.MAX_ANSWER_LENGTH)
  answer!: string;
}

export class GripSubmissionDto implements GripSubmissionRequest {
  @Matches(/^[A-Za-z0-9_-]{16,128}$/)
  requestId!: string;

  @Matches(/^[a-f0-9]{64}$/)
  boardRevision!: string;

  @IsArray()
  @ArrayMinSize(GRIP_HOSTED_POLICY.QUESTION_COUNT)
  @ArrayMaxSize(GRIP_HOSTED_POLICY.QUESTION_COUNT)
  @ArrayUnique((answer: GripAnswerDto) => answer.questionId)
  @ValidateNested({ each: true })
  @Type(() => GripAnswerDto)
  answers!: GripAnswerDto[];
}
