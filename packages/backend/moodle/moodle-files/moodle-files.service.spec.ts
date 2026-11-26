import { Test, TestingModule } from '@nestjs/testing';
import { MoodleFilesService } from './moodle-files.service';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import {
  BadRequestException,
  InternalServerErrorException,
  PayloadTooLargeException,
  RequestTimeoutException,
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

    it('should upload file from data URI and return uploaded metadata', async () => {
      const uploaded = [{ filename: 'test.txt', itemid: 101 }];

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(uploaded),
      } as Response);

      const result = await service.uploadFile(
        'token',
        'test.txt',
        'data:text/plain;base64,aGVsbG8=',
      );

      expect(result).toEqual(uploaded);
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
        JSON.stringify({
          exception: 'moodle_exception',
          errorcode: 'nopermissions',
          message: 'No access',
        }),
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
      ).rejects.toThrow(new BadRequestException('No access'));
    });

    it('allows valid JSON attachments containing an exception property without Moodle envelope', async () => {
      const jsonAttachment = new TextEncoder().encode(
        JSON.stringify({ exception: 'example' }),
      );

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: () => Promise.resolve(jsonAttachment.buffer),
      } as unknown as Response);

      const downloaded = await service.downloadFile(
        'secret-moodle-tok',
        'https://moodle.test/webservice/pluginfile.php/42/sample.json',
      );

      expect(downloaded.filename).toBe('sample.json');
      expect(downloaded.contentType).toBe('application/json');
      expect(downloaded.buffer).toEqual(Buffer.from(jsonAttachment));

      const jsonArray = new TextEncoder().encode(JSON.stringify([1, 2, 3]));

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: () => Promise.resolve(jsonArray.buffer),
      } as unknown as Response);

      const downloadedArray = await service.downloadFile(
        'secret-moodle-tok',
        'https://moodle.test/webservice/pluginfile.php/42/items.json',
      );

      expect(downloadedArray.filename).toBe('items.json');
      expect(downloadedArray.buffer).toEqual(Buffer.from(jsonArray));
    });

    it('treats malformed JSON labeled as application/json as binary download and falls back on missing content-type or filename', async () => {
      const rawBytes = new TextEncoder().encode('not-json');

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: () => Promise.resolve(rawBytes.buffer),
      } as unknown as Response);

      const downloadedJson = await service.downloadFile(
        'secret-moodle-tok',
        'https://moodle.test/webservice/pluginfile.php/',
      );

      expect(downloadedJson.filename).toBe('attachment');
      expect(downloadedJson.buffer).toEqual(Buffer.from('not-json'));

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        arrayBuffer: () => Promise.resolve(Uint8Array.from([9, 8]).buffer),
      } as unknown as Response);

      const downloadedBinary = await service.downloadFile(
        'secret-moodle-tok',
        'https://moodle.test/webservice/pluginfile.php/%20%20',
      );

      expect(downloadedBinary.filename).toBe('attachment');
      expect(downloadedBinary.contentType).toBe('application/octet-stream');
    });

    it('supports subdirectory MOODLE_BASEURL without duplicating installation path', async () => {
      process.env.MOODLE_BASEURL = 'https://moodle.test/moodle';

      const subModule = await Test.createTestingModule({
        providers: [MoodleFilesService, MoodleClientService],
      }).compile();
      const subService = subModule.get<MoodleFilesService>(MoodleFilesService);

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/pdf' }),
        arrayBuffer: () => Promise.resolve(Uint8Array.from([4, 5]).buffer),
      } as unknown as Response);

      const downloaded = await subService.downloadFile(
        'secret-tok',
        'https://moodle.test/moodle/webservice/pluginfile.php/12/spec.pdf',
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://moodle.test/moodle/webservice/pluginfile.php/12/spec.pdf?token=secret-tok',
        expect.objectContaining({ redirect: 'error' }),
      );
      expect(downloaded.filename).toBe('spec.pdf');

      await expect(
        subService.downloadFile(
          'secret-tok',
          'https://moodle.test/moodle-evil/webservice/pluginfile.php/12/spec.pdf',
        ),
      ).rejects.toThrow(BadRequestException);

      process.env.MOODLE_BASEURL = 'https://moodle.test/my%20moodle';

      const encodedSubModule = await Test.createTestingModule({
        providers: [MoodleFilesService, MoodleClientService],
      }).compile();
      const encodedSubService =
        encodedSubModule.get<MoodleFilesService>(MoodleFilesService);

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/pdf' }),
        arrayBuffer: () => Promise.resolve(Uint8Array.from([6, 7]).buffer),
      } as unknown as Response);

      const encodedDownloaded = await encodedSubService.downloadFile(
        'secret-tok',
        'https://moodle.test/my%20moodle/webservice/pluginfile.php/12/spec.pdf',
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://moodle.test/my%20moodle/webservice/pluginfile.php/12/spec.pdf?token=secret-tok',
        expect.objectContaining({ redirect: 'error' }),
      );
      expect(encodedDownloaded.filename).toBe('spec.pdf');
    });

    it('streams bounded response bodies and rejects files exceeding maximum byte limit', async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(Uint8Array.from([1, 2]));
          controller.enqueue(Uint8Array.from([3, 4]));
          controller.close();
        },
      });

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/pdf' }),
        body: stream,
      } as unknown as Response);

      const streamed = await service.downloadFile(
        'secret-moodle-tok',
        'https://moodle.test/webservice/pluginfile.php/42/stream.pdf',
      );

      expect(streamed.buffer).toEqual(Buffer.from([1, 2, 3, 4]));

      const cancelMock = jest.fn().mockResolvedValue(undefined);

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'application/octet-stream',
          'content-length': String(30 * 1024 * 1024),
        }),
        body: { cancel: cancelMock },
      } as unknown as Response);

      await expect(
        service.downloadFile(
          'secret-moodle-tok',
          'https://moodle.test/webservice/pluginfile.php/42/huge-header.bin',
        ),
      ).rejects.toThrow(PayloadTooLargeException);
      expect(cancelMock).toHaveBeenCalled();

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'application/octet-stream',
          'content-length': String(30 * 1024 * 1024),
        }),
      } as unknown as Response);

      await expect(
        service.downloadFile(
          'secret-moodle-tok',
          'https://moodle.test/webservice/pluginfile.php/42/huge-header-no-body.bin',
        ),
      ).rejects.toThrow(PayloadTooLargeException);

      const streamCancelMock = jest.fn().mockResolvedValue(undefined);
      let chunkReads = 0;

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/octet-stream' }),
        body: {
          getReader: () => ({
            read: jest.fn().mockImplementation(async () => {
              chunkReads += 1;

              return chunkReads === 1
                ? { done: false, value: new Uint8Array(13 * 1024 * 1024) }
                : { done: false, value: new Uint8Array(13 * 1024 * 1024) };
            }),
            cancel: streamCancelMock,
          }),
        },
      } as unknown as Response);

      await expect(
        service.downloadFile(
          'secret-moodle-tok',
          'https://moodle.test/webservice/pluginfile.php/42/huge-stream.bin',
        ),
      ).rejects.toThrow(PayloadTooLargeException);
      expect(streamCancelMock).toHaveBeenCalled();

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/octet-stream' }),
        arrayBuffer: () =>
          Promise.resolve(new Uint8Array(26 * 1024 * 1024).buffer),
      } as unknown as Response);

      await expect(
        service.downloadFile(
          'secret-moodle-tok',
          'https://moodle.test/webservice/pluginfile.php/42/huge-fallback.bin',
        ),
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('throws RequestTimeoutException on fetch timeout and InternalServerErrorException on network error or upstream failure', async () => {
      const timeoutError = new Error('Timed out');

      timeoutError.name = 'TimeoutError';
      fetchSpy.mockRejectedValueOnce(timeoutError);

      await expect(
        service.downloadFile(
          'secret-moodle-tok',
          'https://moodle.test/pluginfile.php/42/file.pdf',
        ),
      ).rejects.toThrow(RequestTimeoutException);

      fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(
        service.downloadFile(
          'secret-moodle-tok',
          'https://moodle.test/pluginfile.php/42/file.pdf',
        ),
      ).rejects.toThrow(InternalServerErrorException);

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
