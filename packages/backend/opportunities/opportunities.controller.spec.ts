import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { OpportunityStatus } from '@universe/database';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';

const CACHE_CONTROL_HEADER = 'Cache-Control';
const PUBLIC_CACHE_CONTROL =
  'public, max-age=30, s-maxage=60, stale-while-revalidate=120';
const PRIVATE_CACHE_CONTROL = 'private, no-cache, no-store, must-revalidate';

function createMockResponse(): Response {
  return { setHeader: jest.fn() } as unknown as Response;
}

describe('OpportunitiesController', () => {
  let controller: OpportunitiesController;
  let service: OpportunitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpportunitiesController],
      providers: [
        {
          provide: OpportunitiesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            getDetails: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            changeStatus: jest.fn(),
            changeLifecycleState: jest.fn(),
            getOpportunityApplications: jest.fn(),
            updateApplicationStatus: jest.fn(),
            apply: jest.fn(),
            withdrawApplication: jest.fn(),
            getMyApplications: jest.fn(),
            getMyOpportunities: jest.fn(),
            moderate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OpportunitiesController>(OpportunitiesController);
    service = module.get<OpportunitiesService>(OpportunitiesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('throws ForbiddenException when userId is empty', () => {
      expect(() => controller.create('', {} as any)).toThrow(
        ForbiddenException,
      );
    });

    it('delegates to service.create', async () => {
      await controller.create('user1', {} as any);
      expect(service.create).toHaveBeenCalledWith('user1', {});
    });
  });

  describe('findAll', () => {
    it('delegates to service.findAll', async () => {
      await controller.findAll('user1', {});
      expect(service.findAll).toHaveBeenCalledWith({}, 'user1', undefined);
    });

    it('should prevent stale HTTP caches from delaying catalog polling', async () => {
      const mockRes = createMockResponse();

      await controller.findAll('user1', {}, undefined, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        CACHE_CONTROL_HEADER,
        PRIVATE_CACHE_CONTROL,
      );
    });

    it('should prevent stale HTTP caches for an explicitly published catalog', async () => {
      const mockRes = createMockResponse();

      await controller.findAll(
        undefined,
        { status: OpportunityStatus.PUBLISHED },
        undefined,
        mockRes,
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        CACHE_CONTROL_HEADER,
        PRIVATE_CACHE_CONTROL,
      );
    });

    it('sets private Cache-Control header when query status is non-published', async () => {
      const mockRes = createMockResponse();

      await controller.findAll(
        'moderator1',
        { status: OpportunityStatus.READY_FOR_REVIEW },
        ['OPPORTUNITIES_MODERATOR'],
        mockRes,
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        CACHE_CONTROL_HEADER,
        PRIVATE_CACHE_CONTROL,
      );
    });

    it('does not set Cache-Control header when service.findAll throws', async () => {
      const mockRes = createMockResponse();

      (service.findAll as jest.Mock).mockRejectedValueOnce(
        new ForbiddenException('Forbidden'),
      );

      await expect(
        controller.findAll(
          'user1',
          { status: OpportunityStatus.DRAFT },
          ['MOODLE_STUDENT'],
          mockRes,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRes.setHeader).not.toHaveBeenCalled();
    });
  });

  describe('getMyOpportunities', () => {
    it('throws ForbiddenException when userId is empty', () => {
      expect(() => controller.getMyOpportunities('')).toThrow(
        ForbiddenException,
      );
    });

    it('delegates to service.getMyOpportunities', async () => {
      await controller.getMyOpportunities('user1');
      expect(service.getMyOpportunities).toHaveBeenCalledWith('user1');
    });
  });

  describe('withdrawApplication', () => {
    it('throws ForbiddenException when userId is empty', () => {
      expect(() => controller.withdrawApplication('', 'app1')).toThrow(
        ForbiddenException,
      );
    });

    it('delegates to service.withdrawApplication', async () => {
      await controller.withdrawApplication('user1', 'app1');
      expect(service.withdrawApplication).toHaveBeenCalledWith('user1', 'app1');
    });
  });

  describe('getMyApplications', () => {
    it('forwards caller roles for current permission verification', async () => {
      await controller.getMyApplications('user1', ['OPPORTUNITIES_MODERATOR']);
      expect(service.getMyApplications).toHaveBeenCalledWith('user1', [
        'OPPORTUNITIES_MODERATOR',
      ]);
    });

    it('throws ForbiddenException when userId is empty', () => {
      expect(() => controller.getMyApplications('')).toThrow(
        ForbiddenException,
      );
    });

    it('delegates to service.getMyApplications', async () => {
      await controller.getMyApplications('user1');
      expect(service.getMyApplications).toHaveBeenCalledWith('user1', []);
    });
  });

  describe('findOne', () => {
    it('returns a private unavailable preview', async () => {
      const preview = { id: 'opp1', title: '', availability: 'temporary' };
      const response = createMockResponse();

      (service.getDetails as jest.Mock).mockResolvedValue(preview);
      await expect(
        controller.findOne('opp1', undefined, undefined, response),
      ).resolves.toEqual(preview);
      expect(response.setHeader).toHaveBeenCalledWith(
        CACHE_CONTROL_HEADER,
        PRIVATE_CACHE_CONTROL,
      );
    });

    it('preserves NotFoundException for a missing opportunity', async () => {
      const response = createMockResponse();

      (service.getDetails as jest.Mock).mockRejectedValue(
        new NotFoundException(),
      );
      await expect(
        controller.findOne('missing', undefined, undefined, response),
      ).rejects.toThrow(NotFoundException);
      expect(response.setHeader).not.toHaveBeenCalled();
    });

    it('propagates unexpected service errors', async () => {
      const error = new Error('Database unavailable');

      (service.getDetails as jest.Mock).mockRejectedValue(error);
      await expect(controller.findOne('opp1')).rejects.toBe(error);
    });

    it('delegates to service.getDetails', async () => {
      (service.getDetails as jest.Mock).mockResolvedValue({
        id: 'opp1',
        status: OpportunityStatus.PUBLISHED,
      });

      await controller.findOne('opp1', 'user1', ['MOODLE_STUDENT']);
      expect(service.getDetails).toHaveBeenCalledWith('opp1', 'user1', [
        'MOODLE_STUDENT',
      ]);
    });

    it('sets public Cache-Control header when opportunity is published', async () => {
      (service.getDetails as jest.Mock).mockResolvedValue({
        id: 'opp1',
        status: OpportunityStatus.PUBLISHED,
      });

      const mockRes = createMockResponse();

      await controller.findOne('opp1', 'user1', ['MOODLE_STUDENT'], mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        CACHE_CONTROL_HEADER,
        PUBLIC_CACHE_CONTROL,
      );
    });

    it('sets public Cache-Control header for anonymous published access', async () => {
      (service.getDetails as jest.Mock).mockResolvedValue({
        id: 'opp1',
        status: OpportunityStatus.PUBLISHED,
      });

      const mockRes = createMockResponse();

      await controller.findOne('opp1', undefined, undefined, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        CACHE_CONTROL_HEADER,
        PUBLIC_CACHE_CONTROL,
      );
    });

    it('sets private Cache-Control header when opportunity is non-published', async () => {
      (service.getDetails as jest.Mock).mockResolvedValue({
        id: 'opp1',
        status: OpportunityStatus.DRAFT,
      });

      const mockRes = createMockResponse();

      await controller.findOne('opp1', 'user1', ['MOODLE_STUDENT'], mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        CACHE_CONTROL_HEADER,
        PRIVATE_CACHE_CONTROL,
      );
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when userId is empty', () => {
      expect(() => controller.update('', 'opp1', {} as any)).toThrow(
        ForbiddenException,
      );
    });

    it('delegates to service.update', async () => {
      await controller.update('user1', 'opp1', {} as any);
      expect(service.update).toHaveBeenCalledWith('user1', 'opp1', {});
    });
  });

  describe('delete', () => {
    it('throws ForbiddenException when userId is empty', () => {
      expect(() => controller.delete('', 'opp1')).toThrow(ForbiddenException);
    });

    it('delegates to service.delete', async () => {
      await controller.delete('user1', 'opp1');
      expect(service.delete).toHaveBeenCalledWith('user1', 'opp1');
    });
  });

  describe('changeStatus', () => {
    it('throws ForbiddenException when userId is empty', () => {
      expect(() =>
        controller.changeStatus('', 'opp1', {
          status: OpportunityStatus.READY_FOR_REVIEW,
        }),
      ).toThrow(ForbiddenException);
    });

    it('delegates to service.changeStatus', async () => {
      await controller.changeStatus('user1', 'opp1', {
        status: OpportunityStatus.READY_FOR_REVIEW,
      });
      expect(service.changeStatus).toHaveBeenCalledWith(
        'user1',
        'opp1',
        OpportunityStatus.READY_FOR_REVIEW,
      );
    });
  });

  describe('changeLifecycleState', () => {
    it('throws ForbiddenException when userId is empty', () => {
      expect(() =>
        controller.changeLifecycleState('', 'opp1', {
          lifecycleState: 'CLOSED',
        } as any),
      ).toThrow(ForbiddenException);
    });

    it('delegates to service.changeLifecycleState', async () => {
      await controller.changeLifecycleState('user1', 'opp1', {
        lifecycleState: 'CLOSED',
      } as any);
      expect(service.changeLifecycleState).toHaveBeenCalledWith(
        'user1',
        'opp1',
        'CLOSED',
      );
    });
  });

  describe('getOpportunityApplications', () => {
    it('throws ForbiddenException when userId is empty', () => {
      expect(() => controller.getOpportunityApplications('', 'opp1')).toThrow(
        ForbiddenException,
      );
    });

    it('delegates to service.getOpportunityApplications', async () => {
      await controller.getOpportunityApplications('user1', 'opp1');
      expect(service.getOpportunityApplications).toHaveBeenCalledWith(
        'user1',
        'opp1',
      );
    });
  });

  describe('updateApplicationStatus', () => {
    it('throws ForbiddenException when userId is empty', () => {
      expect(() =>
        controller.updateApplicationStatus('', 'app1', {
          status: 'ACCEPTED',
        } as any),
      ).toThrow(ForbiddenException);
    });

    it('delegates to service.updateApplicationStatus', async () => {
      await controller.updateApplicationStatus('user1', 'app1', {
        status: 'ACCEPTED',
        comment: 'Welcome',
      } as any);
      expect(service.updateApplicationStatus).toHaveBeenCalledWith({
        userId: 'user1',
        applicationId: 'app1',
        status: 'ACCEPTED',
        ownerComment: 'Welcome',
      });
    });
  });

  describe('apply', () => {
    it('throws ForbiddenException when userId is empty', () => {
      expect(() => controller.apply('', 'opp1', {} as any)).toThrow(
        ForbiddenException,
      );
    });

    it('delegates to service.apply', async () => {
      await controller.apply('user1', 'opp1', {} as any);
      expect(service.apply).toHaveBeenCalledWith('user1', 'opp1', {});
    });
  });

  describe('moderate', () => {
    it('throws ForbiddenException when userId is empty', () => {
      expect(() => controller.moderate('', 'opp1', {} as any)).toThrow(
        ForbiddenException,
      );
    });

    it('delegates to service.moderate', async () => {
      await controller.moderate('user1', 'opp1', {} as any);
      expect(service.moderate).toHaveBeenCalledWith('user1', 'opp1', {});
    });
  });
});
