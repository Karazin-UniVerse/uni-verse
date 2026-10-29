import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { BadGatewayException, Logger } from '@nestjs/common';
import { GeminiClientService } from '../gemini-client.service';
import type { GripConfig } from '../grip.types';
import type { GripCompletionRequest } from '@universe/core/types/grip';

describe('GeminiClientService redirect refusal with native fetch', () => {
  let server: Server;
  let origin: string;
  let upstreamCalls: number;
  let targetCalls: number;
  let redirect: boolean;
  let authorizations: string[];

  beforeEach(async () => {
    upstreamCalls = 0;
    targetCalls = 0;
    redirect = true;
    authorizations = [];
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    server = createServer((incoming, response) => {
      incoming.resume();

      if (incoming.url === '/target') {
        targetCalls += 1;
      } else {
        upstreamCalls += 1;
        authorizations.push(incoming.headers.authorization ?? '');
      }

      if (redirect) {
        response.writeHead(302, { Location: '/target' }).end();
      } else {
        response
          .writeHead(200, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ choices: [{ message: { content: '{}' } }] }));
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Expected local TCP address');
    }

    origin = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
    jest.restoreAllMocks();
  });

  it('rejects redirects once without following them or cooling down the key pool', async () => {
    const config: GripConfig = {
      enabled: true,
      geminiApiKeys: ['first-secret', 'second-secret'],
      geminiModel: 'gemini-3.5-flash-lite',
      geminiBaseUrl: origin,
      githubApiUrl: 'https://api.github.com',
      githubOAuthClientId: 'client',
      githubPermissionToken: 'pat',
      githubOwner: 'owner',
      githubRepository: 'repo',
      trustedProxyAddresses: [],
    };
    const request: GripCompletionRequest = {
      model: 'gemini-3.5-flash-lite',
      messages: [
        { role: 'system', content: 'system' },
        { role: 'user', content: 'user' },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'Board', schema: {} },
      },
    };
    const service = new GeminiClientService(config);

    await expect(service.complete(request)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(upstreamCalls).toBe(1);
    expect(targetCalls).toBe(0);
    redirect = false;
    await expect(service.complete(request)).resolves.toBeDefined();
    await expect(service.complete(request)).resolves.toBeDefined();
    expect(upstreamCalls).toBe(3);
    expect(authorizations).toEqual([
      'Bearer first-secret',
      'Bearer second-secret',
      'Bearer first-secret',
    ]);
  });
});
