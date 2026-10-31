import type { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { GRIP_MAX_REQUEST_BYTES } from '../grip/grip.constants';

export function configureBodyParsers(app: NestExpressApplication): void {
  // Grip gateway feature parser: strictly limited to 256 KiB, all types parsed as JSON
  app.use(
    '/dev-tools/grip',
    express.json({
      limit: GRIP_MAX_REQUEST_BYTES,
      type: '*/*',
    }),
  );

  // Standard portal parsers: 10 MiB limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
}
