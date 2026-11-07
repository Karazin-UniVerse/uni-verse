import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

describe('TagsController', () => {
  let controller: TagsController;
  let service: TagsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [
        {
          provide: TagsService,
          useValue: {
            suggest: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TagsController>(TagsController);
    service = module.get<TagsService>(TagsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate string queries to service.suggest', async () => {
    const mockTags = [{ id: '1', name: 'react' }];

    jest.spyOn(service, 'suggest').mockResolvedValue(mockTags);

    const result = await controller.suggest('react');

    expect(result).toEqual(mockTags);
    expect(service.suggest).toHaveBeenCalledWith('react');
  });

  it('should pass empty string when query is an array to avoid crash', async () => {
    jest.spyOn(service, 'suggest').mockResolvedValue([]);

    const result = await controller.suggest(['a', 'b']);

    expect(result).toEqual([]);
    expect(service.suggest).toHaveBeenCalledWith('');
  });
});
