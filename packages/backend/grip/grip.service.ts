import { Injectable } from '@nestjs/common';
import type { GripCompletionResponse } from '@universe/core/types/grip';
import { GeminiClientService } from './gemini-client.service';
import { GripQuotaService } from './grip-quota.service';
import type { CompleteParams } from './grip.types';

@Injectable()
export class GripService {
  constructor(
    private readonly geminiClient: GeminiClientService,
    private readonly quotaService: GripQuotaService,
  ) {}

  async complete({
    principal,
    request,
    signal,
  }: CompleteParams): Promise<GripCompletionResponse> {
    const { leaseId } = await this.quotaService.reserveCompletion(
      principal.githubId,
    );

    try {
      return await this.geminiClient.complete(request, signal);
    } finally {
      await this.quotaService.releaseCompletion(leaseId);
    }
  }
}
