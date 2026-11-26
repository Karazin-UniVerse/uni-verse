import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export function isAllowedOrigin(origin: string): boolean {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    ...(!isProduction
      ? ['http://localhost:3000', 'http://localhost:3001']
      : []),
    'https://universemvp.tech',
  ];

  return allowedOrigins.includes(origin);
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
