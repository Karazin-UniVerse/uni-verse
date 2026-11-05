import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TAG_SUGGEST_LIMIT } from '@universe/core/constants/tags';
import { normalizeTag } from '@universe/core/utils/tags';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async suggest(query: string): Promise<Array<{ id: string; name: string }>> {
    const name = normalizeTag(query ?? '');

    return this.prisma.tag.findMany({
      where: name ? { name: { contains: name } } : {},
      orderBy: [{ opportunities: { _count: 'desc' } }, { name: 'asc' }],
      take: TAG_SUGGEST_LIMIT,
      select: { id: true, name: true },
    });
  }
}
