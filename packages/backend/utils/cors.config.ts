import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const PRODUCTION_ORIGIN = 'https://universemvp.tech';

function isLocalDevOrigin(origin: string): boolean {
  try {
    const { hostname, protocol } = new URL(origin);
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

    return isLocalHost && (protocol === 'http:' || protocol === 'https:');
  } catch {
    return false;
  }
}

export function isAllowedOrigin(origin: string): boolean {
  if (!origin) {
    return false;
  }

  if (origin === PRODUCTION_ORIGIN || origin === process.env.FRONTEND_URL) {
    return true;
  }

  return process.env.NODE_ENV !== 'production' && isLocalDevOrigin(origin);
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
