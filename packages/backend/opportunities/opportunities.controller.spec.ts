import { Test, TestingModule } from '@nestjs/testing';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';
import { ForbiddenException } from '@nestjs/common';

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
    it('throws ForbiddenException if unauthenticated', () => {
      expect(() => controller.create('', {} as any)).toThrow(
        ForbiddenException,
      );
    });

    it('calls service.create', async () => {
      await controller.create('user1', {} as any);
      expect(service.create).toHaveBeenCalledWith('user1', {});
    });
  });

  describe('findAll', () => {
    it('calls service.findAll', async () => {
      await controller.findAll('STUDENT', {} as any);
      expect(service.findAll).toHaveBeenCalledWith({}, 'STUDENT');
    });
  });

  describe('getMyOpportunities', () => {
    it('throws ForbiddenException if unauthenticated', () => {
      expect(() => controller.getMyOpportunities('')).toThrow(
        ForbiddenException,
      );
    });

    it('calls service.getMyOpportunities', async () => {
      await controller.getMyOpportunities('user1');
      expect(service.getMyOpportunities).toHaveBeenCalledWith('user1');
    });
  });

  describe('withdrawApplication', () => {
    it('throws ForbiddenException if unauthenticated', () => {
      expect(() => controller.withdrawApplication('', 'app1')).toThrow(
        ForbiddenException,
      );
    });

    it('calls service.withdrawApplication', async () => {
      await controller.withdrawApplication('user1', 'app1');
      expect(service.withdrawApplication).toHaveBeenCalledWith('user1', 'app1');
    });
  });

  describe('getMyApplications', () => {
    it('throws ForbiddenException if unauthenticated', () => {
      expect(() => controller.getMyApplications('')).toThrow(
        ForbiddenException,
      );
    });

    it('calls service.getMyApplications', async () => {
      await controller.getMyApplications('user1');
      expect(service.getMyApplications).toHaveBeenCalledWith('user1');
    });
  });

  describe('findOne', () => {
    it('calls service.findOne', async () => {
      await controller.findOne('opp1', 'user1', 'STUDENT');
      expect(service.findOne).toHaveBeenCalledWith('opp1', 'user1', 'STUDENT');
    });
  });

  describe('update', () => {
    it('throws ForbiddenException if unauthenticated', () => {
      expect(() => controller.update('', 'opp1', {} as any)).toThrow(
        ForbiddenException,
      );
    });

    it('calls service.update', async () => {
      await controller.update('user1', 'opp1', {} as any);
      expect(service.update).toHaveBeenCalledWith('user1', 'opp1', {});
    });
  });

  describe('changeStatus', () => {
    it('throws ForbiddenException if unauthenticated', () => {
      expect(() =>
        controller.changeStatus('', 'opp1', 'READY_FOR_REVIEW'),
      ).toThrow(ForbiddenException);
    });

    it('calls service.changeStatus', async () => {
      await controller.changeStatus('user1', 'opp1', 'READY_FOR_REVIEW');
      expect(service.changeStatus).toHaveBeenCalledWith(
        'user1',
        'opp1',
        'READY_FOR_REVIEW',
      );
    });
  });

  describe('changeLifecycleState', () => {
    it('throws ForbiddenException if unauthenticated', () => {
      expect(() =>
        controller.changeLifecycleState('', 'opp1', {
          lifecycleState: 'ACTIVE',
        } as any),
      ).toThrow(ForbiddenException);
    });

    it('calls service.changeLifecycleState', async () => {
      await controller.changeLifecycleState('user1', 'opp1', {
        lifecycleState: 'ACTIVE',
      } as any);
      expect(service.changeLifecycleState).toHaveBeenCalledWith(
        'user1',
        'opp1',
        'ACTIVE',
      );
    });
  });

  describe('getOpportunityApplications', () => {
    it('throws ForbiddenException if unauthenticated', () => {
      expect(() => controller.getOpportunityApplications('', 'opp1')).toThrow(
        ForbiddenException,
      );
    });

    it('calls service.getOpportunityApplications', async () => {
      await controller.getOpportunityApplications('user1', 'opp1');
      expect(service.getOpportunityApplications).toHaveBeenCalledWith(
        'user1',
        'opp1',
      );
    });
  });

  describe('updateApplicationStatus', () => {
    it('throws ForbiddenException if unauthenticated', () => {
      expect(() =>
        controller.updateApplicationStatus('', 'app1', {
          status: 'ACCEPTED',
          comment: 'ok',
        } as any),
      ).toThrow(ForbiddenException);
    });

    it('calls service.updateApplicationStatus', async () => {
      await controller.updateApplicationStatus('user1', 'app1', {
        status: 'ACCEPTED',
        comment: 'ok',
      } as any);
      expect(service.updateApplicationStatus).toHaveBeenCalledWith({
        userId: 'user1',
        applicationId: 'app1',
        status: 'ACCEPTED',
        ownerComment: 'ok',
      });
    });
  });

  describe('apply', () => {
    it('throws ForbiddenException if unauthenticated', () => {
      expect(() => controller.apply('', 'opp1', {} as any)).toThrow(
        ForbiddenException,
      );
    });

    it('calls service.apply', async () => {
      await controller.apply('user1', 'opp1', {} as any);
      expect(service.apply).toHaveBeenCalledWith('user1', 'opp1', {});
    });
  });

  describe('moderate', () => {
    it('throws ForbiddenException if unauthenticated', () => {
      expect(() => controller.moderate('', 'opp1', {} as any)).toThrow(
        ForbiddenException,
      );
    });

    it('calls service.moderate', async () => {
      await controller.moderate('user1', 'opp1', {} as any);
      expect(service.moderate).toHaveBeenCalledWith('user1', 'opp1', {});
    });
  });
});
