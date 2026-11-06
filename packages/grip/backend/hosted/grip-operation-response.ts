import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import type { GripCheckStatus } from '@universe/core/types/grip-hosted';

export function gripOperationResponse(
  result: GripCheckStatus,
  response: Response,
): GripCheckStatus {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Referrer-Policy', 'no-referrer');

  if (result.state === 'QUOTA_REJECTED') response.status(HttpStatus.TOO_MANY_REQUESTS);
  else if (result.state === 'GENERATING' || result.state === 'GRADING')
    response.status(HttpStatus.ACCEPTED);
  else response.status(HttpStatus.OK);

  return {
    checkId: result.checkId,
    state: result.state,
    bindingDigest: result.bindingDigest,
    expiresAt: result.expiresAt,
    passValidUntil: result.passValidUntil,
    policyVersion: result.policyVersion,
    ...(result.score !== undefined ? { score: result.score } : {}),
    ...(result.reason !== undefined ? { reason: result.reason } : {}),
  };
}
