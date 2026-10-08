import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';

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
            findOne: jest.fn(),
            update: jest.fn(),
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
      await controller.findAll('STUDENT', {} as any);
      expect(service.findAll).toHaveBeenCalledWith({}, 'STUDENT');
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
    it('throws ForbiddenException when userId is empty', () => {
      expect(() => controller.getMyApplications('')).toThrow(
        ForbiddenException,
      );
    });

    it('delegates to service.getMyApplications', async () => {
      await controller.getMyApplications('user1');
      expect(service.getMyApplications).toHaveBeenCalledWith('user1');
    });
  });

  describe('findOne', () => {
    it('delegates to service.findOne', async () => {
      await controller.findOne('opp1', 'user1', 'STUDENT');
      expect(service.findOne).toHaveBeenCalledWith('opp1', 'user1', 'STUDENT');
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

  describe('changeStatus', () => {
    it('throws ForbiddenException when userId is empty', () => {
      expect(() =>
        controller.changeStatus('', 'opp1', 'READY_FOR_REVIEW'),
      ).toThrow(ForbiddenException);
    });

    it('delegates to service.changeStatus', async () => {
      await controller.changeStatus('user1', 'opp1', 'READY_FOR_REVIEW');
      expect(service.changeStatus).toHaveBeenCalledWith(
        'user1',
        'opp1',
        'READY_FOR_REVIEW',
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
