import { Test, TestingModule } from '@nestjs/testing';
import { MoodleAssignmentsService } from './moodle-assignments.service';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import { BadRequestException } from '@nestjs/common';

describe('MoodleAssignmentsService', () => {
  let service: MoodleAssignmentsService;

  const mockMoodleClientService = {
    client: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoodleAssignmentsService,
        { provide: MoodleClientService, useValue: mockMoodleClientService },
      ],
    }).compile();

    service = module.get<MoodleAssignmentsService>(MoodleAssignmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAssignments', () => {
    it('should throw BadRequestException if token or moodleId is missing', async () => {
      await expect(service.getAssignments('', 'id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getAssignments('token', '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle empty courses', async () => {
      mockMoodleClientService.client.mockResolvedValue({ courses: [] });
      const result = await service.getAssignments('token', 'id');

      expect(result).toEqual([]);
    });

    it('should return parsed assignments', async () => {
      mockMoodleClientService.client.mockResolvedValue({
        courses: [
          {
            fullname: 'Algorithms 2025/2026 Sem 1',
            shortname: 'ALG',
            assignments: [
              { id: 1, name: 'A1', duedate: 1234567, intro: 'Test' },
            ],
          },
        ],
      });
      const result = await service.getAssignments('token', 'id');

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('A1');
      expect(result[0].year).toBe('2025/2026');
      expect(result[0].semester).toBe(1);
    });

    it('should enrich assignments with submission status when includeStatus is true', async () => {
      mockMoodleClientService.client
        .mockResolvedValueOnce({
          courses: [
            {
              fullname: 'Algorithms',
              shortname: 'ALG',
              assignments: [
                { id: 1, name: 'A1', duedate: 1234567, intro: 'Test' },
              ],
            },
          ],
        })
        .mockResolvedValueOnce({
          lastattempt: {
            gradingstatus: 'graded',
            submission: { status: 'submitted' },
          },
          feedback: { grade: { grade: '95' } },
        });

      const result = await service.getAssignments('token', 'id', true);

      expect(result.length).toBe(1);
      expect(result[0].submissionStatus).toBe('graded');
      expect(result[0].grade).toBe('95');
      expect(result[0].graded).toBe(true);
    });

    it('should catch errors, log them, and return empty list', async () => {
      mockMoodleClientService.client.mockRejectedValue(
        new Error('Network failure'),
      );
      const result = await service.getAssignments('token', 'id');

      expect(result).toEqual([]);
    });
  });

  describe('getSubmissionStatus', () => {
    it('should return graded status', async () => {
      mockMoodleClientService.client.mockResolvedValue({
        lastattempt: {
          gradingstatus: 'graded',
          submission: { status: 'submitted' },
        },
        feedback: { grade: { grade: '95.50' } },
      });
      const result = await service.getSubmissionStatus('token', 'id', 1);

      expect(result.status).toBe('graded');
      expect(result.grade).toBe('95.5');
    });

    it('should return rawGrade directly when grade is not a numeric string', async () => {
      mockMoodleClientService.client.mockResolvedValue({
        lastattempt: {
          gradingstatus: 'graded',
          submission: { status: 'submitted' },
        },
        feedback: { grade: { grade: 'Passed' } },
      });

      const result = await service.getSubmissionStatus('token', 'id', 1);

      expect(result.status).toBe('graded');
      expect(result.grade).toBe('Passed');
    });

    it('should return submission status when grading is incomplete and grade is absent', async () => {
      mockMoodleClientService.client.mockResolvedValue({
        lastattempt: {
          gradingstatus: 'notgraded',
          submission: { status: 'submitted' },
        },
      });

      const result = await service.getSubmissionStatus('token', 'id', 1);

      expect(result.status).toBe('submitted');
      expect(result.grade).toBeUndefined();
    });

    it('should throw BadRequestException if token or moodleId is missing', async () => {
      await expect(service.getSubmissionStatus('', 'id', 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getSubmissionStatus('token', '', 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('saveSubmission', () => {
    it('should throw BadRequestException if token is missing', async () => {
      await expect(service.saveSubmission('', 1, 'text')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should save submission with text and fileItemId', async () => {
      mockMoodleClientService.client.mockResolvedValue({ status: true });

      const result = await service.saveSubmission('token', 1, 'My text', 12345);

      expect(result).toEqual({ status: true });
      expect(mockMoodleClientService.client).toHaveBeenCalledWith(
        'mod_assign_save_submission',
        'token',
        undefined,
        {
          assignmentid: 1,
          plugindata: {
            onlinetext_editor: { text: 'My text', format: 1, itemid: 0 },
            files_filemanager: 12345,
          },
        },
      );
    });
  });
});
