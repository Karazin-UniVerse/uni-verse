import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const getCorsConfig = (): CorsOptions => {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'https://universemvp.tech',
    'http://universemvp.tech',
  ].filter(Boolean) as string[];

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        return callback(null, true);
      }

      try {
        const parsed = new URL(origin);
        const host = parsed.hostname;
        const isLocal = host === 'localhost' || host === '127.0.0.1';
        const isSecure = parsed.protocol === 'https:';

        if (
          (isLocal &&
            (parsed.protocol === 'http:' || parsed.protocol === 'https:')) ||
          (isSecure &&
            (host === 'universemvp.tech' ||
              host.endsWith('.universemvp.tech') ||
              host === 'karazin.ua' ||
              host.endsWith('.karazin.ua'))) ||
          allowedOrigins.includes(origin)
        ) {
          return callback(null, true);
        }
      } catch {
        // Ignore invalid URL
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
