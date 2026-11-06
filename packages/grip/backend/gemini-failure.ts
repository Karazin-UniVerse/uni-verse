import { HttpException, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import {
  GRIP_MODEL_FAILURE_REASON,
  type GripModelFailureReason,
} from '@universe/core/constants/grip-hosted';

export function classifyGeminiFailure<Exception extends HttpException>(
  exception: Exception,
  reason: GripModelFailureReason,
): Exception & { reason: GripModelFailureReason } {
  return Object.assign(exception, { reason });
}

export function throwGeminiBlockingFailure(reason: GripModelFailureReason): void {
  if (reason === GRIP_MODEL_FAILURE_REASON.PROVIDER_QUOTA) {
    throw classifyGeminiFailure(
      new HttpException('Upstream quota exceeded', HttpStatus.TOO_MANY_REQUESTS),
      reason,
    );
  }

  if (reason === GRIP_MODEL_FAILURE_REASON.CREDENTIAL_UNAVAILABLE) {
    throw classifyGeminiFailure(
      new ServiceUnavailableException('Upstream model service unavailable'),
      reason,
    );
  }
}
