import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { GripSessionService } from '../grip-session.service';
import type { GithubClientService } from '../github-client.service';
import type { GripQuotaService } from '../grip-quota.service';
import type { GripStorageService } from '../grip-storage.service';

describe('GripSessionService', () => {
  const validToken = 'ugr_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';
  let service: GripSessionService;
  let mockStorage: {
    createSession: jest.Mock;
    findSession: jest.Mock;
    revokeSession: jest.Mock;
  };
  let mockGithub: {
    identify: jest.Mock;
    assertWriter: jest.Mock;
  };
  let mockQuota: {
    reserveSessionExchange: jest.Mock;
  };

  beforeEach(() => {
    mockStorage = {
      createSession: jest.fn(),
      findSession: jest.fn(),
      revokeSession: jest.fn(),
    };
    mockGithub = {
      identify: jest.fn(),
      assertWriter: jest.fn(),
    };
    mockQuota = {
      reserveSessionExchange: jest.fn().mockResolvedValue(undefined),
    };
    service = new GripSessionService(
      mockStorage as unknown as GripStorageService,
      mockGithub as unknown as GithubClientService,
      mockQuota as unknown as GripQuotaService,
    );
  });

  describe('exchange', () => {
    it('identifies user, verifies write permission, creates hashed session and returns raw token', async () => {
      mockGithub.identify.mockResolvedValue({
        githubId: '12345',
        login: 'octocat',
      });
      mockGithub.assertWriter.mockResolvedValue(undefined);
      mockStorage.createSession.mockResolvedValue({
        id: 'session-uuid',
        tokenHash: 'somehash',
        githubId: '12345',
        githubLogin: 'octocat',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 86400 * 1000),
        revokedAt: null,
      });

      const response = await service.exchange({
        githubToken: 'gho_access_token',
        clientIp: '127.0.0.1',
      });

      expect(response.token).toMatch(/^ugr_[A-Za-z0-9_-]{43}$/);
      expect(response.expiresAt).toBeDefined();
      expect(mockQuota.reserveSessionExchange).toHaveBeenCalledWith(
        '127.0.0.1',
      );
      expect(mockGithub.identify).toHaveBeenCalledWith('gho_access_token');
      expect(mockGithub.assertWriter).toHaveBeenCalledWith({
        githubId: '12345',
        login: 'octocat',
      });
      expect(mockStorage.createSession).toHaveBeenCalledWith({
        tokenHash: expect.any(String),
        githubId: '12345',
        githubLogin: 'octocat',
        expiresAt: expect.any(Date),
      });

      const storedTokenHash =
        mockStorage.createSession.mock.calls[0][0].tokenHash;

      expect(storedTokenHash).not.toEqual(response.token);
    });

    it('reserves session exchange quota before calling GitHub', async () => {
      mockQuota.reserveSessionExchange.mockRejectedValueOnce(
        new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS),
      );

      await expect(
        service.exchange({
          githubToken: 'gho_access_token',
          clientIp: '127.0.0.1',
        }),
      ).rejects.toThrow(HttpException);
      expect(mockGithub.identify).not.toHaveBeenCalled();
    });
  });

  describe('authenticate', () => {
    it('authenticates valid token and rechecks repository write permission', async () => {
      mockStorage.findSession.mockResolvedValue({
        id: 'session-uuid',
        tokenHash: 'somehash',
        githubId: '12345',
        githubLogin: 'octocat',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
        revokedAt: null,
      });
      mockGithub.assertWriter.mockResolvedValue(undefined);

      const principal = await service.authenticate(validToken);

      expect(principal).toEqual({
        githubId: '12345',
        login: 'octocat',
        sessionId: 'session-uuid',
      });
      expect(mockGithub.assertWriter).toHaveBeenCalledWith({
        githubId: '12345',
        login: 'octocat',
      });
    });

    it('rejects malformed token format without querying storage', async () => {
      await expect(service.authenticate('invalid-prefix-123')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.authenticate('ugr_short')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockStorage.findSession).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when session is missing in storage', async () => {
      mockStorage.findSession.mockResolvedValue(null);

      await expect(service.authenticate(validToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('revoke', () => {
    it('revokes session idempotently when found', async () => {
      mockStorage.findSession.mockResolvedValue({
        id: 'session-uuid',
        tokenHash: 'somehash',
        githubId: '12345',
        githubLogin: 'octocat',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
        revokedAt: null,
      });

      await service.revoke(validToken);

      expect(mockStorage.revokeSession).toHaveBeenCalledWith('session-uuid');
    });

    it('ignores non-existent or malformed token on revoke without throwing', async () => {
      await expect(service.revoke('invalid-token')).resolves.toBeUndefined();
      expect(mockStorage.revokeSession).not.toHaveBeenCalled();
    });
  });
});
