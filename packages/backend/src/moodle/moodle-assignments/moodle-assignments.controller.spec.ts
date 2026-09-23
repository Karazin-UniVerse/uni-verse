import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MoodleAssignmentsController } from './moodle-assignments.controller';
import { MoodleAssignmentsService } from './moodle-assignments.service';
import {
  GetAssignmentsQueryDto,
  AssignmentItemDto,
  SaveSubmissionDto,
  SubmissionStatusDto,
} from './moodle-assignments-dto';

describe('MoodleAssignmentsController', () => {
  let controller: MoodleAssignmentsController;

  const mockService = {
    getAssignments: jest.fn(),
    getSubmissionStatus: jest.fn(),
    saveSubmission: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoodleAssignmentsController],
      providers: [{ provide: MoodleAssignmentsService, useValue: mockService }],
    }).compile();

    controller = module.get<MoodleAssignmentsController>(
      MoodleAssignmentsController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('DTO transformation and validation', () => {
    it('should transform and validate GetAssignmentsQueryDto including includeStatus', async () => {
      const plain = {
        year: '2025/2026',
        semester: '1',
        status: 'completed',
        sortByDate: 'asc',
        dateFrom: '1672531200',
        dateTo: '1704067200',
        includeStatus: 'true',
      };

      const dto = plainToInstance(GetAssignmentsQueryDto, plain);

      expect(typeof dto.dateFrom).toBe('number');
      expect(typeof dto.dateTo).toBe('number');
      expect(typeof dto.includeStatus).toBe('boolean');
      expect(dto.includeStatus).toBe(true);

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should validate AssignmentItemDto and SaveSubmissionDto', async () => {
      const item = plainToInstance(AssignmentItemDto, {
        id: 1,
        courseId: 2,
        courseName: 'CS',
        name: 'HW1',
        duedate: 123456,
        submissionStatus: 'submitted',
        grade: '100',
        graded: true,
        submittedAt: '1727000000',
        isLate: true,
      });
      const itemErrors = await validate(item);

      expect(itemErrors.length).toBe(0);
      expect(typeof item.submittedAt).toBe('number');
      expect(item.isLate).toBe(true);

      const statusDto = plainToInstance(SubmissionStatusDto, {
        status: 'submitted',
        grade: '90',
        submittedAt: '1727000000',
        isLate: false,
      });
      const statusErrors = await validate(statusDto);

      expect(statusErrors.length).toBe(0);
      expect(typeof statusDto.submittedAt).toBe('number');
      expect(statusDto.isLate).toBe(false);

      const saveDto = plainToInstance(SaveSubmissionDto, {
        text: 'hello',
        fileItemId: 999,
      });
      const saveErrors = await validate(saveDto);

      expect(saveErrors.length).toBe(0);
    });
  });

  describe('getAssignments', () => {
    it('should filter assignments by completed status using duedate fallback', async () => {
      const now = Date.now() / 1000;

      mockService.getAssignments.mockResolvedValue([
        {
          id: 1,
          duedate: now - 10000,
          year: '2025/2026',
          semester: 1,
        },
        {
          id: 2,
          duedate: now + 10000,
          year: '2024/2025',
          semester: 2,
        },
        {
          id: 3,
          duedate: 0,
          year: '2025/2026',
          semester: 1,
        },
      ]);
      const result = await controller.getAssignments('token', 'id', {
        status: 'completed',
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });

    it('should filter assignments by not_completed status using duedate fallback', async () => {
      const now = Date.now() / 1000;

      mockService.getAssignments.mockResolvedValue([
        {
          id: 1,
          duedate: now - 10000,
          year: '2025/2026',
          semester: 1,
        },
        {
          id: 2,
          duedate: now + 10000,
          year: '2024/2025',
          semester: 2,
        },
        {
          id: 3,
          duedate: 0,
          year: '2025/2026',
          semester: 1,
        },
      ]);
      const result = await controller.getAssignments('token', 'id', {
        status: 'not_completed',
      });

      expect(result.map((a) => a.id)).toEqual([2, 3]);
    });

    it('should filter assignments by completed and not_completed with submissionStatus and graded flags', async () => {
      mockService.getAssignments.mockResolvedValue([
        {
          id: 1,
          name: 'Task 1',
          submissionStatus: 'submitted',
          duedate: 0,
        },
        {
          id: 2,
          name: 'Task 2',
          submissionStatus: 'graded',
          graded: false,
          duedate: 0,
        },
        {
          id: 3,
          name: 'Task 3',
          submissionStatus: 'draft',
          graded: true,
          duedate: 0,
        },
        {
          id: 4,
          name: 'Task 4',
          submissionStatus: 'new',
          graded: false,
          duedate: Date.now() / 1000 - 5000,
        },
        {
          id: 5,
          name: 'Task 5',
          submissionStatus: 'draft',
          graded: false,
          duedate: Date.now() / 1000 + 50000,
        },
      ]);

      const completed = await controller.getAssignments('token', 'id', {
        status: 'completed',
      });

      expect(completed.map((a) => a.id)).toEqual([1, 2, 3]);

      const notCompleted = await controller.getAssignments('token', 'id', {
        status: 'not_completed',
      });

      expect(notCompleted.map((a) => a.id)).toEqual([4, 5]);
    });

    it('should filter assignments by year and semester', async () => {
      mockService.getAssignments.mockResolvedValue([
        { id: 1, year: '2025/2026', semester: 1, duedate: 100 },
        { id: 2, year: '2025/2026', semester: 2, duedate: 200 },
        { id: 3, year: '2024/2025', semester: 1, duedate: 300 },
      ]);

      const result = await controller.getAssignments('token', 'id', {
        year: '2025/2026',
        semester: '1',
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });

    it('should filter by dateFrom and dateTo, and sort by date', async () => {
      mockService.getAssignments.mockResolvedValue([
        { id: 1, duedate: 100 },
        { id: 2, duedate: 200 },
        { id: 3, duedate: 300 },
      ]);

      const dateFiltered = await controller.getAssignments('token', 'id', {
        dateFrom: 150,
        dateTo: 250,
      });

      expect(dateFiltered.length).toBe(1);
      expect(dateFiltered[0].id).toBe(2);

      const sortedDesc = await controller.getAssignments('token', 'id', {
        sortByDate: 'desc',
      });

      expect(sortedDesc.map((a) => a.id)).toEqual([3, 2, 1]);

      const sortedAsc = await controller.getAssignments('token', 'id', {
        sortByDate: 'asc',
      });

      expect(sortedAsc.map((a) => a.id)).toEqual([1, 2, 3]);
    });

    it('should pass includeStatus to service', async () => {
      mockService.getAssignments.mockResolvedValue([]);

      await controller.getAssignments('token', 'id', {
        includeStatus: true,
      });

      expect(mockService.getAssignments).toHaveBeenCalledWith(
        'token',
        'id',
        true,
      );
    });
  });

  describe('getSubmissionStatus', () => {
    it('should delegate to service', async () => {
      mockService.getSubmissionStatus.mockResolvedValue({
        status: 'submitted',
      });

      const result = await controller.getSubmissionStatus('token', 'id', 123);

      expect(result).toEqual({ status: 'submitted' });
      expect(mockService.getSubmissionStatus).toHaveBeenCalledWith(
        'token',
        'id',
        123,
      );
    });
  });

  describe('saveSubmission', () => {
    it('should delegate to service', async () => {
      mockService.saveSubmission.mockResolvedValue({ success: true });

      const result = await controller.saveSubmission('token', 123, {
        text: 'test',
        fileItemId: 456,
      });

      expect(result).toEqual({ success: true });
      expect(mockService.saveSubmission).toHaveBeenCalledWith(
        'token',
        123,
        'test',
        456,
      );
    });
  });
});
