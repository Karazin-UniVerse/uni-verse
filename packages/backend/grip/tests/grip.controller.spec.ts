import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { GripController } from '../grip.controller';
import type { GripService } from '../grip.service';
import type { GripSessionService } from '../grip-session.service';
import type { GripConfig, GripPrincipal } from '../grip.types';

describe('GripController', () => {
  let controller: GripController;
  let mockSessionService: {
    exchange: jest.Mock;
    revoke: jest.Mock;
  };
  let mockGripService: {
    complete: jest.Mock;
  };

  const mockConfig: GripConfig = {
    enabled: true,
    geminiApiKeys: ['key'],
    geminiModel: 'gemini-3.5-flash-lite',
    geminiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    githubApiUrl: 'https://api.github.com',
    githubOAuthClientId: 'client',
    githubPermissionToken: 'pat',
    githubOwner: 'owner',
    githubRepository: 'repo',
    trustedProxyAddresses: ['127.0.0.1'],
  };

  beforeEach(() => {
    mockSessionService = {
      exchange: jest.fn(),
      revoke: jest.fn(),
    };
    mockGripService = {
      complete: jest.fn(),
    };

    controller = new GripController(
      mockSessionService as unknown as GripSessionService,
      mockGripService as unknown as GripService,
      mockConfig,
    );
  });

  describe('createSession', () => {
    it('throws UnauthorizedException when Authorization header is missing or invalid', async () => {
      const mockReq = {
        socket: { remoteAddress: '127.0.0.1' },
        headers: {},
      } as Request;
      const mockRes = { setHeader: jest.fn() } as unknown as Response;

      await expect(
        controller.createSession(undefined, mockReq, mockRes),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.createSession('Basic dXNlcjpwYXNz', mockReq, mockRes),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('exchanges token with resolved client IP and sets Cache-Control: no-store', async () => {
      const mockReq = {
        socket: { remoteAddress: '127.0.0.1' },
        headers: {},
      } as Request;
      const mockRes = { setHeader: jest.fn() } as unknown as Response;

      mockSessionService.exchange.mockResolvedValue({
        token: 'ugr_testtoken',
        expiresAt: '2026-11-26T00:00:00.000Z',
      });

      const response = await controller.createSession(
        'Bearer gho_test123',
        mockReq,
        mockRes,
      );

      expect(response.token).toBe('ugr_testtoken');
      expect(mockSessionService.exchange).toHaveBeenCalledWith({
        githubToken: 'gho_test123',
        clientIp: '127.0.0.1',
      });
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-store',
      );
    });
  });

  describe('revokeSession', () => {
    it('throws UnauthorizedException when Authorization header is missing or invalid', async () => {
      await expect(controller.revokeSession(undefined)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(
        controller.revokeSession('Basic dXNlcjpwYXNz'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('revokes session for provided bearer token', async () => {
      await controller.revokeSession('Bearer ugr_token_to_revoke');

      expect(mockSessionService.revoke).toHaveBeenCalledWith(
        'ugr_token_to_revoke',
      );
    });
  });

  describe('complete', () => {
    it('validates request, coordinates completion and returns result', async () => {
      const principal: GripPrincipal = {
        githubId: '123',
        login: 'octocat',
        sessionId: 'sess-1',
      };

      const validBody = {
        model: 'gemini-3.5-flash-lite',
        messages: [
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'usr' },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'Board',
            schema: { type: 'object' },
          },
        },
      };

      const mockReq = { on: jest.fn(), off: jest.fn() } as unknown as Request;
      const mockRes = { on: jest.fn(), off: jest.fn() } as unknown as Response;

      mockGripService.complete.mockResolvedValue({
        choices: [{ message: { role: 'assistant', content: '{}' } }],
      });

      const result = await controller.complete(
        principal,
        validBody,
        mockReq,
        mockRes,
      );

      expect(result.choices[0].message.content).toBe('{}');
      expect(mockGripService.complete).toHaveBeenCalledWith({
        principal,
        request: expect.objectContaining({ model: 'gemini-3.5-flash-lite' }),
        signal: expect.any(AbortSignal),
      });
    });
  });
});
