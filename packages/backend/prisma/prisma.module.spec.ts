import { Test } from '@nestjs/testing';
import { Inject, Injectable, Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';

@Injectable()
class GripPrismaConsumer {
  constructor(@Inject('GRIP_PRISMA') readonly prisma: object) {}
}

@Module({ providers: [GripPrismaConsumer] })
class GripFixtureModule {}

describe('PrismaModule', () => {
  it('shares the existing Prisma instance with the Grip module', async () => {
    const prisma = {};
    const module = await Test.createTestingModule({
      imports: [PrismaModule, GripFixtureModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    expect(module.get('GRIP_PRISMA')).toBe(prisma);
    expect(module.get(GripPrismaConsumer).prisma).toBe(prisma);
    await module.close();
  });
});
