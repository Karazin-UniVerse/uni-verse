import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: 'GRIP_PRISMA', useExisting: PrismaService },
  ],
  exports: [PrismaService, 'GRIP_PRISMA'],
})
export class PrismaModule {}
