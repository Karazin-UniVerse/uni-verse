import { Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
    service = new PrismaService();
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    jest.restoreAllMocks();
  });

  it('should initialize with fallback connection string when DATABASE_URL is not set', () => {
    delete process.env.DATABASE_URL;
    const fallbackService = new PrismaService();

    expect(fallbackService).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should log success when $connect resolves', async () => {
      const logSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined);

      jest.spyOn(service, '$connect').mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(logSpy).toHaveBeenCalledWith('Database connected successfully');
    });

    it('should catch error and log warning when $connect throws Error instance', async () => {
      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);

      jest
        .spyOn(service, '$connect')
        .mockRejectedValue(new Error('Connection refused'));

      await service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Database connection to PostgreSQL is unavailable (Connection refused)',
        ),
      );
    });

    it('should catch error and log warning when $connect throws non-Error object', async () => {
      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);

      jest.spyOn(service, '$connect').mockRejectedValue('Fatal network error');

      await service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Database connection to PostgreSQL is unavailable (Fatal network error)',
        ),
      );
    });
  });
});
