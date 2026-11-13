import { ForbiddenException, ParseUUIDPipe } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Role } from '@universe/database';
import { RescheduleEventDto } from './dto/reschedule-event.dto';
import { TimetableRescheduleRequestsController } from './timetable-reschedule-requests.controller';
import { TimetableRescheduleRequestsService } from './timetable-reschedule-requests.service';
import { TimetableReschedulingService } from './timetable-rescheduling.service';

describe('TimetableRescheduleRequestsController', () => {
  let controller: TimetableRescheduleRequestsController;

  const mockRequestsService = {
    create: jest.fn(),
    listMine: jest.fn(),
    listForReview: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  };

  const mockReschedulingService = {
    preview: jest.fn(),
    reschedule: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimetableRescheduleRequestsController],
      providers: [
        {
          provide: TimetableRescheduleRequestsService,
          useValue: mockRequestsService,
        },
        {
          provide: TimetableReschedulingService,
          useValue: mockReschedulingService,
        },
      ],
    }).compile();

    controller = module.get(TimetableRescheduleRequestsController);
  });

  const proposal = {
    eventId: '8ec5db6a-98ae-4f88-a7d8-bd645e53404d',
    newDate: '2027-10-05',
    newPair: 2,
    scope: 'ONCE' as const,
    reason: 'Conference',
  };

  it('routes preview with ADMIN or INSTRUCTOR mode based on session roles', async () => {
    mockReschedulingService.preview.mockResolvedValue({ changes: [] });

    await controller.preview(proposal, 'user-1', [Role.INSTRUCTOR]);
    expect(mockReschedulingService.preview).toHaveBeenCalledWith(
      proposal,
      'user-1',
      'INSTRUCTOR',
    );

    await controller.preview(proposal, 'admin-1', [Role.ADMIN]);
    expect(mockReschedulingService.preview).toHaveBeenCalledWith(
      proposal,
      'admin-1',
      'ADMIN',
    );
  });

  it('delegates create and listMine with session userId', async () => {
    mockRequestsService.create.mockResolvedValue({ id: 'req-1' });
    mockRequestsService.listMine.mockResolvedValue({ items: [] });

    await controller.create(proposal, 'teacher-1');
    await controller.listMine({ page: 1, pageSize: 20 }, 'teacher-1');

    expect(mockRequestsService.create).toHaveBeenCalledWith(
      'teacher-1',
      proposal,
    );
    expect(mockRequestsService.listMine).toHaveBeenCalledWith('teacher-1', {
      page: 1,
      pageSize: 20,
    });
  });

  it.each([Role.INSTRUCTOR, Role.OPPORTUNITIES_USER, undefined])(
    'rejects non-admin role %s on review and direct rescheduling routes',
    async (role) => {
      const roles = role ? [role] : undefined;

      expect(() => controller.list({}, roles)).toThrow(ForbiddenException);
      expect(() => controller.approve('req-1', 'user-1', roles)).toThrow(
        ForbiddenException,
      );
      expect(() =>
        controller.reject('req-1', { explanation: 'No' }, 'user-1', roles),
      ).toThrow(ForbiddenException);
      expect(() =>
        controller.reschedule(
          'event-1',
          { newDate: '2027-10-05', newPair: 2, scope: 'ONCE', reason: 'Move' },
          'user-1',
          roles,
        ),
      ).toThrow(ForbiddenException);
    },
  );

  it('delegates admin review and direct rescheduling routes', async () => {
    mockRequestsService.listForReview.mockResolvedValue({ items: [] });
    mockRequestsService.approve.mockResolvedValue({ id: 'req-1' });
    mockRequestsService.reject.mockResolvedValue({ id: 'req-1' });
    mockReschedulingService.reschedule.mockResolvedValue({ changes: [] });

    await controller.list({ status: 'PENDING' }, [Role.ADMIN]);
    await controller.approve('req-1', 'admin-1', [Role.ADMIN]);
    await controller.reject(
      'req-1',
      { explanation: 'Room conflict' },
      'admin-1',
      [Role.ADMIN],
    );
    await controller.reschedule(
      'event-1',
      {
        newDate: '2027-10-05',
        newPair: 2,
        scope: 'SERIES',
        reason: 'Schedule sync',
      },
      'admin-1',
      [Role.ADMIN],
    );

    expect(mockRequestsService.listForReview).toHaveBeenCalledWith({
      status: 'PENDING',
    });
    expect(mockRequestsService.approve).toHaveBeenCalledWith(
      'req-1',
      'admin-1',
    );
    expect(mockRequestsService.reject).toHaveBeenCalledWith(
      'req-1',
      'admin-1',
      'Room conflict',
    );
    expect(mockReschedulingService.reschedule).toHaveBeenCalledWith(
      {
        eventId: 'event-1',
        newDate: '2027-10-05',
        newPair: 2,
        scope: 'SERIES',
        reason: 'Schedule sync',
      },
      'admin-1',
    );
  });

  it('applies ParseUUIDPipe to id params and validates RescheduleEventDto', async () => {
    for (const method of ['approve', 'reject', 'reschedule'] as const) {
      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TimetableRescheduleRequestsController,
        method,
      ) as Record<string, { index: number; pipes?: unknown[] }>;
      const paramZero = Object.values(metadata).find(
        (entry) => entry.index === 0,
      );

      expect(paramZero?.pipes).toContain(ParseUUIDPipe);
    }

    const valid = plainToInstance(RescheduleEventDto, {
      newDate: '2027-10-05',
      newPair: 2,
      scope: 'ONCE',
      reason: '  Makeup  ',
    });

    expect(await validate(valid)).toEqual([]);
    expect(valid.reason).toBe('Makeup');

    const blank = plainToInstance(RescheduleEventDto, {
      newDate: '2027-10-05',
      newPair: 2,
      scope: 'ONCE',
      reason: '   ',
    });

    expect((await validate(blank)).length).toBeGreaterThan(0);
  });
});
