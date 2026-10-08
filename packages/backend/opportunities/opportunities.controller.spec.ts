import { Test, TestingModule } from '@nestjs/testing';
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

  it('create calls service.create', async () => {
    await controller.create('user1', {} as any);
    expect(service.create).toHaveBeenCalledWith('user1', {});
  });

  it('findAll calls service.findAll', async () => {
    await controller.findAll('STUDENT', {} as any);
    expect(service.findAll).toHaveBeenCalledWith({}, 'STUDENT');
  });

  it('findOne calls service.findOne', async () => {
    await controller.findOne('opp1', 'user1', 'STUDENT');
    expect(service.findOne).toHaveBeenCalledWith('opp1', 'user1', 'STUDENT');
  });

  it('update calls service.update', async () => {
    await controller.update('user1', 'opp1', {} as any);
    expect(service.update).toHaveBeenCalledWith('user1', 'opp1', {});
  });

  it('moderate calls service.moderate', async () => {
    await controller.moderate('user1', 'opp1', {} as any);
    expect(service.moderate).toHaveBeenCalledWith('user1', 'opp1', {});
  });
});
