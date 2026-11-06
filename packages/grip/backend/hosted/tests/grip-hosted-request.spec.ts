import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GripCreateCheckDto, GripSubmissionDto } from '../dto/grip-check.dto';

describe('hosted Grip request validation', () => {
  it('should reject malformed manifest refs, wrong repository and excessive UTF-8 diff', async () => {
    const input = plainToInstance(GripCreateCheckDto, {
      requestId: 'intent',
      intentCreatedAt: new Date().toISOString(),
      diff: '日'.repeat(30_000),
      files: ['handler.ts'],
      truncated: false,
      manifest: {
        repository: 'attacker/repository',
        updates: [
          {
            localRef: 'bad ref',
            localOid: 'invalid',
            remoteRef: 'refs/heads/a',
            remoteOid: '0'.repeat(40),
          },
        ],
        policyVersion: 'hosted-v1',
        diffDigest: 'f'.repeat(64),
      },
    });

    expect((await validate(input)).length).toBeGreaterThan(0);
  });

  it('should reject missing or duplicate answer IDs and client-supplied extra score fields', async () => {
    const input = plainToInstance(GripSubmissionDto, {
      requestId: 'intent',
      boardRevision: 'a'.repeat(64),
      answers: Array.from({ length: 5 }, () => ({
        questionId: 'q1',
        answer: 'answer',
      })),
      score: 100,
    });

    expect(
      (await validate(input, { whitelist: true, forbidNonWhitelisted: true })).length,
    ).toBeGreaterThan(0);
  });
});
