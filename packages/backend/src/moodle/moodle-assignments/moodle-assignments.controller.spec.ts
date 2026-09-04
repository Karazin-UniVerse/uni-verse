import { Test, TestingModule } from '@nestjs/testing';
import { MoodleAssignmentsController } from './moodle-assignments.controller';
import { MoodleAssignmentsService } from './moodle-assignments.service';

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

  it('should filter assignments', async () => {
    mockService.getAssignments.mockResolvedValue([
      {
        id: 1,
        duedate: Date.now() / 1000 - 10000,
        year: '2025/2026',
        semester: 1,
      },
      {
        id: 2,
        duedate: Date.now() / 1000 + 10000,
        year: '2024/2025',
        semester: 2,
      },
    ]);
    const result = await controller.getAssignments('token', 'id', {
      status: 'completed',
    });

    expect(result.length).toBe(1);
    expect(result[0].id).toBe(1);
  });
});
