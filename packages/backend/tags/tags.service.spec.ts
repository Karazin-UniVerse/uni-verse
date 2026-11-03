import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TagsService } from './tags.service';

describe('TagsService', () => {
  let service: TagsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: PrismaService,
          useValue: {
            tag: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty list if query is shorter than 3 characters', async () => {
    const result = await service.suggest('re');

    expect(result).toEqual([]);
    expect(prisma.tag.findMany).not.toHaveBeenCalled();
  });

  it('should suggest tags when query is at least 3 characters', async () => {
    const mockTags = [
      { id: '1', name: 'react' },
      { id: '2', name: 'reactive' },
    ];

    jest.spyOn(prisma.tag, 'findMany').mockResolvedValue(mockTags as any);

    const result = await service.suggest('  ReAc  ');

    expect(result).toEqual(mockTags);
    expect(prisma.tag.findMany).toHaveBeenCalledWith({
      where: { name: { contains: 'reac' } },
      orderBy: [{ opportunities: { _count: 'desc' } }, { name: 'asc' }],
      take: 10,
      select: { id: true, name: true },
    });
  });
});
