import { Test, TestingModule } from '@nestjs/testing';
import { MoodleFilesService } from './moodle-files.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('MoodleFilesService', () => {
  let service: MoodleFilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoodleFilesService],
    }).compile();

    service = module.get<MoodleFilesService>(MoodleFilesService);
    process.env.MOODLE_BASEURL = 'https://moodle.test';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should throw BadRequestException if token is missing', async () => {
      await expect(
        service.uploadFile('', 'test.txt', 'base64'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException if MOODLE_BASEURL missing', async () => {
      delete process.env.MOODLE_BASEURL;
      await expect(
        service.uploadFile('token', 'test.txt', 'base64'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle fetch failure', async () => {
      process.env.MOODLE_BASEURL = 'https://moodle.test';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });
      await expect(
        service.uploadFile('token', 'test.txt', 'base64'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle moodle exception', async () => {
      process.env.MOODLE_BASEURL = 'https://moodle.test';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ exception: 'moodle_exception', message: 'Error' }),
      });
      await expect(
        service.uploadFile('token', 'test.txt', 'base64'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
