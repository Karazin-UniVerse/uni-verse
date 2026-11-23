import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { MoodleFilesController } from './moodle-files.controller';
import { MoodleFilesService } from './moodle-files.service';

describe('MoodleFilesController', () => {
  let controller: MoodleFilesController;

  const MOCK_SERVICE = {
    uploadFile: jest.fn(),
    downloadFile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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

  describe('downloadFile', () => {
    it('streams attachment bytes with safe download headers', async () => {
      const fileBuffer = Buffer.from('pdf-bytes');

      MOCK_SERVICE.downloadFile.mockResolvedValue({
        buffer: fileBuffer,
        contentType: 'application/pdf',
        filename: 'Звіт завдання.pdf',
      });

      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.downloadFile(
        'moodle-token',
        { url: 'https://moodle.test/webservice/pluginfile.php/1/file.pdf' },
        res,
      );

      expect(MOCK_SERVICE.downloadFile).toHaveBeenCalledWith(
        'moodle-token',
        'https://moodle.test/webservice/pluginfile.php/1/file.pdf',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename="'),
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'private, no-store',
      );
      expect(res.send).toHaveBeenCalledWith(fileBuffer);
    });

    it('falls back to "attachment" when filename is empty', async () => {
      const fileBuffer = Buffer.from('bytes');

      MOCK_SERVICE.downloadFile.mockResolvedValue({
        buffer: fileBuffer,
        contentType: 'application/octet-stream',
        filename: '',
      });

      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.downloadFile(
        'moodle-token',
        { url: 'https://moodle.test/webservice/pluginfile.php/' },
        res,
      );

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="attachment"; filename*=UTF-8\'\'',
      );
    });
  });

  describe('uploadFile', () => {
    it('delegates file upload to MoodleFilesService with user Moodle token', async () => {
      const uploaded = [{ filename: 'notes.txt', itemid: 42 }];

      MOCK_SERVICE.uploadFile.mockResolvedValue(uploaded);

      const result = await controller.uploadFile('moodle-token', {
        filename: 'notes.txt',
        filebase64: 'aGVsbG8=',
      });

      expect(MOCK_SERVICE.uploadFile).toHaveBeenCalledWith(
        'moodle-token',
        'notes.txt',
        'aGVsbG8=',
      );
      expect(result).toEqual(uploaded);
    });
  });
});
