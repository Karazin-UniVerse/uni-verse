import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { MoodleFilesController } from './moodle-files.controller';
import { MoodleFilesService } from './moodle-files.service';

describe('MoodleFilesController', () => {
  let controller: MoodleFilesController;

  const MOCK_SERVICE = {
    uploadFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoodleFilesController],
      providers: [
        {
          provide: PrismaService,
          useValue: { user: { findUnique: jest.fn() } },
        },
        { provide: MoodleFilesService, useValue: MOCK_SERVICE },
      ],
    }).compile();

    controller = module.get<MoodleFilesController>(MoodleFilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
