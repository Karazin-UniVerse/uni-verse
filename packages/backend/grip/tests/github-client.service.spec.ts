import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { GithubClientService } from '../github-client.service';
import type { GripConfig } from '../grip.types';

describe('GithubClientService', () => {
  let service: GithubClientService;
  const mockConfig: GripConfig = {
    enabled: true,
    geminiApiKeys: ['gemini-key'],
    geminiModel: 'gemini-3.5-flash-lite',
    geminiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    githubApiUrl: 'https://api.github.com',
    githubOAuthClientId: 'client-id',
    githubPermissionToken: 'server-permission-pat',
    githubOwner: 'Karazin-UniVerse',
    githubRepository: 'uni-verse',
    trustedProxyAddresses: [],
  };

  beforeEach(() => {
    service = new GithubClientService(mockConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('identify', () => {
    it('returns numeric id and login for valid access token', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1234567, login: 'testuser' }),
      } as Response);

      const identity = await service.identify('gho_valid_token');

      expect(identity).toEqual({ githubId: '1234567', login: 'testuser' });
    });

    it('throws UnauthorizedException on 401/403 or malformed payload', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      await expect(service.identify('gho_invalid')).rejects.toThrow(
        UnauthorizedException,
      );

      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ unexpected: true }),
      } as Response);

      await expect(service.identify('gho_malformed')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  it('should exchange a browser code with the exact redirect and PKCE verifier without following redirects', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      Response.json({
        access_token: 'github-access',
        token_type: 'bearer',
        scope: '',
      }),
    );

    await expect(
      service.exchangeAuthorizationCode({
        code: 'code',
        redirectUri: 'https://portal.example/callback',
        codeVerifier: 'verifier',
        clientId: 'client-id',
        clientSecret: 'client-secret',
      }),
    ).resolves.toBe('github-access');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://github.com/login/oauth/access_token',
      expect.objectContaining({
        method: 'POST',
        redirect: 'error',
        body: expect.any(String),
      }),
    );
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toEqual({
      client_id: 'client-id',
      client_secret: 'client-secret',
      code: 'code',
      redirect_uri: 'https://portal.example/callback',
      code_verifier: 'verifier',
    });
  });

  describe('assertWriter', () => {
    it.each([401, 403, 429])(
      'fails closed on GitHub credential or quota HTTP %s',
      async (status) => {
        jest
          .spyOn(global, 'fetch')
          .mockResolvedValueOnce(new Response('', { status }));

        await expect(
          service.assertWriter({ githubId: '1234567', login: 'testuser' }),
        ).rejects.toThrow(ForbiddenException);
      },
    );
    it('accepts write, admin and maintain permissions', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          permission: 'write',
          user: { id: 1234567, login: 'testuser' },
        }),
      } as Response);

      await expect(
        service.assertWriter({ githubId: '1234567', login: 'testuser' }),
      ).resolves.toBeUndefined();

      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          permission: 'admin',
          user: { id: 1234567, login: 'testuser' },
        }),
      } as Response);

      await expect(
        service.assertWriter({ githubId: '1234567', login: 'testuser' }),
      ).resolves.toBeUndefined();

      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          role_name: 'maintain',
          permission: 'write',
          user: { id: 1234567, login: 'testuser' },
        }),
      } as Response);

      await expect(
        service.assertWriter({ githubId: '1234567', login: 'testuser' }),
      ).resolves.toBeUndefined();
    });

    it('rejects read, triage and none permissions with ForbiddenException', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          permission: 'read',
          user: { id: 1234567, login: 'testuser' },
        }),
      } as Response);

      await expect(
        service.assertWriter({ githubId: '1234567', login: 'testuser' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when numeric id does not match (reused login)', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          permission: 'admin',
          user: { id: 9999999, login: 'testuser' },
        }),
      } as Response);

      await expect(
        service.assertWriter({ githubId: '1234567', login: 'testuser' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ServiceUnavailableException on network or GitHub server errors', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Network offline'));

      await expect(
        service.assertWriter({ githubId: '1234567', login: 'testuser' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
