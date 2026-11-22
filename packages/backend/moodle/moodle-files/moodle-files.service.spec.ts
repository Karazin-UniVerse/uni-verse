import { Test, TestingModule } from '@nestjs/testing';
import { MoodleFilesService } from './moodle-files.service';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('MoodleFilesService', () => {
  let service: MoodleFilesService;

  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    process.env.MOODLE_BASEURL = 'https://moodle.test';

    const module: TestingModule = await Test.createTestingModule({
      providers: [MoodleFilesService, MoodleClientService],
    }).compile();

    service = module.get<MoodleFilesService>(MoodleFilesService);
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

  describe('downloadFile', () => {
    it('rejects missing Moodle token, invalid URL, cross-origin URL, and non-pluginfile paths', async () => {
      await expect(
        service.downloadFile(
          '',
          'https://moodle.test/webservice/pluginfile.php/1/task.pdf',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.downloadFile('moodle-tok', 'not-a-url'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.downloadFile(
          'moodle-tok',
          'https://evil.example/webservice/pluginfile.php/1/task.pdf',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.downloadFile(
          'moodle-tok',
          'https://moodle.test/admin/settings.php',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.downloadFile(
          'moodle-tok',
          'https://moodle.test/webservice/pluginfile.php/../secret.txt',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.downloadFile(
          'moodle-tok',
          'https://moodle.test/webservice/pluginfile.php/%2e%2e/admin/settings.php',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.downloadFile(
          'moodle-tok',
          'https://moodle.test/webservice/pluginfile.php/%zz',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('fetches pluginfile from Moodle base URL with server-side token and redirect: error', async () => {
      const bodyBytes = Uint8Array.from([1, 2, 3]).buffer;

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/pdf' }),
        arrayBuffer: () => Promise.resolve(bodyBytes),
      } as unknown as Response);

      const downloaded = await service.downloadFile(
        'secret-moodle-tok',
        'https://moodle.test/webservice/pluginfile.php/42/mod_assign/intro/lab%201.pdf?forcedownload=1&token=spoofed',
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://moodle.test/webservice/pluginfile.php/42/mod_assign/intro/lab%201.pdf?forcedownload=1&token=secret-moodle-tok',
        expect.objectContaining({ redirect: 'error' }),
      );
      expect(downloaded.filename).toBe('lab 1.pdf');
      expect(downloaded.contentType).toBe('application/pdf');
      expect(downloaded.buffer).toEqual(Buffer.from([1, 2, 3]));
    });

    it('rejects Moodle JSON exception responses during file download', async () => {
      const errorBytes = new TextEncoder().encode(
        JSON.stringify({ exception: 'moodle_exception', message: 'No access' }),
      );

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: () => Promise.resolve(errorBytes.buffer),
      } as unknown as Response);

      await expect(
        service.downloadFile(
          'secret-moodle-tok',
          'https://moodle.test/webservice/pluginfile.php/42/file.pdf',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws InternalServerErrorException when upstream response fails', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Gateway',
      } as Response);

      await expect(
        service.downloadFile(
          'secret-moodle-tok',
          'https://moodle.test/pluginfile.php/42/file.pdf',
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
