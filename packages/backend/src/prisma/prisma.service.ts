import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@universe/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.warn(
        `Database connection to PostgreSQL is unavailable (${error instanceof Error ? error.message : String(error)}). Moodle proxy and Swagger endpoints remain active.`,
      );
    }
  }
}
