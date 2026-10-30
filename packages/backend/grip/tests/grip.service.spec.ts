import { HttpException, HttpStatus } from '@nestjs/common';
import type { GripCompletionRequest } from '@universe/core/types/grip';
import { GripService } from '../grip.service';
import type { GeminiClientService } from '../gemini-client.service';
import type { GripQuotaService } from '../grip-quota.service';
import type { GripPrincipal } from '../grip.types';

describe('GripService', () => {
  let service: GripService;
  let mockQuotaService: {
    reserveCompletion: jest.Mock;
    releaseCompletion: jest.Mock;
  };
  let mockGeminiClient: {
    complete: jest.Mock;
  };

  const principal: GripPrincipal = {
    githubId: '987654',
    login: 'testdev',
    sessionId: 'session-id-1',
  };

  const request: GripCompletionRequest = {
    model: 'gemini-3.5-flash-lite',
    messages: [
      { role: 'system', content: 'system' },
      { role: 'user', content: 'user' },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'Board',
        schema: {},
      },
    },
  };

  beforeEach(() => {
    mockQuotaService = {
      reserveCompletion: jest.fn().mockResolvedValue({ leaseId: 'lease-xyz' }),
      releaseCompletion: jest.fn().mockResolvedValue(undefined),
    };
    mockGeminiClient = {
      complete: jest.fn().mockResolvedValue({
        choices: [{ message: { role: 'assistant', content: '{}' } }],
      }),
    };

    service = new GripService(
      mockGeminiClient as unknown as GeminiClientService,
      mockQuotaService as unknown as GripQuotaService,
    );
  });

  it('acquires quota reservation, calls Gemini, and releases lease in finally', async () => {
    const response = await service.complete({ principal, request });

    expect(response.choices[0].message.content).toBe('{}');
    expect(mockQuotaService.reserveCompletion).toHaveBeenCalledWith('987654');
    expect(mockGeminiClient.complete).toHaveBeenCalledWith(request, undefined);
    expect(mockQuotaService.releaseCompletion).toHaveBeenCalledWith(
      'lease-xyz',
    );
  });

  it('releases lease when GeminiClientService throws', async () => {
    mockGeminiClient.complete.mockRejectedValue(new Error('Upstream crash'));

    await expect(service.complete({ principal, request })).rejects.toThrow(
      'Upstream crash',
    );

    expect(mockQuotaService.reserveCompletion).toHaveBeenCalledWith('987654');
    expect(mockQuotaService.releaseCompletion).toHaveBeenCalledWith(
      'lease-xyz',
    );
  });

  it('never calls Gemini if quota reservation fails', async () => {
    mockQuotaService.reserveCompletion.mockRejectedValue(
      new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS),
    );

    await expect(service.complete({ principal, request })).rejects.toThrow(
      HttpException,
    );

    expect(mockGeminiClient.complete).not.toHaveBeenCalled();
    expect(mockQuotaService.releaseCompletion).not.toHaveBeenCalled();
  });

  it('passes abort signal through to geminiClient', async () => {
    const controller = new AbortController();

    await service.complete({ principal, request, signal: controller.signal });

    expect(mockGeminiClient.complete).toHaveBeenCalledWith(
      request,
      controller.signal,
    );
  });

  it('does not reserve quota for an already cancelled request', async () => {
    const controller = new AbortController();

    controller.abort();

    await expect(
      service.complete({ principal, request, signal: controller.signal }),
    ).rejects.toThrow();
    expect(mockQuotaService.reserveCompletion).not.toHaveBeenCalled();
    expect(mockGeminiClient.complete).not.toHaveBeenCalled();
  });

  it('releases the lease without calling Gemini if cancellation arrives during reservation', async () => {
    const controller = new AbortController();

    mockQuotaService.reserveCompletion.mockImplementationOnce(async () => {
      controller.abort();

      return { leaseId: 'lease-cancelled' };
    });

    await expect(
      service.complete({ principal, request, signal: controller.signal }),
    ).rejects.toThrow();
    expect(mockGeminiClient.complete).not.toHaveBeenCalled();
    expect(mockQuotaService.releaseCompletion).toHaveBeenCalledWith(
      'lease-cancelled',
    );
  });
});
