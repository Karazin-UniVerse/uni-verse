import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export function isAllowedOrigin(origin: string): boolean {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    ...(!isProduction
      ? ['http://localhost:3000', 'http://localhost:3001']
      : []),
    'https://universemvp.tech',
  ].filter(Boolean) as string[];

  try {
    const parsed = new URL(origin);
    const host = parsed.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const isSecure = parsed.protocol === 'https:';

    if (
      (!isProduction &&
        isLocal &&
        (parsed.protocol === 'http:' || parsed.protocol === 'https:')) ||
      (isSecure &&
        (host === 'universemvp.tech' ||
          host.endsWith('.universemvp.tech') ||
          host === 'karazin.ua' ||
          host.endsWith('.karazin.ua'))) ||
      allowedOrigins.includes(origin)
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export const getCorsConfig = (): CorsOptions => {
  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
};
