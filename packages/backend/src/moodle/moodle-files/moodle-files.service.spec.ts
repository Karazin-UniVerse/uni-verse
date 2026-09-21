import { Test, TestingModule } from '@nestjs/testing';
import { MoodleFilesService } from './moodle-files.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('MoodleFilesService', () => {
  let service: MoodleFilesService;

  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoodleFilesService],
    }).compile();

    service = module.get<MoodleFilesService>(MoodleFilesService);
    process.env.MOODLE_BASEURL = 'https://moodle.test';
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockReset();
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

    it('should throw InternalServerErrorException if MOODLE_BASEURL is invalid', async () => {
      process.env.MOODLE_BASEURL = 'ftp://invalid-url';
      await expect(
        service.uploadFile('token', 'test.txt', 'base64'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle fetch failure', async () => {
      process.env.MOODLE_BASEURL = 'https://moodle.test';
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as Response);
      await expect(
        service.uploadFile('token', 'test.txt', 'base64'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle moodle exception', async () => {
      process.env.MOODLE_BASEURL = 'https://moodle.test';
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ exception: 'moodle_exception', message: 'Error' }),
      } as Response);
      await expect(
        service.uploadFile('token', 'test.txt', 'base64'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
