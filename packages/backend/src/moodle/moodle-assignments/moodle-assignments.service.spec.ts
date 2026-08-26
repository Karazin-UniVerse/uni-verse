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
  });
});
