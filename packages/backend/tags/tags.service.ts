import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  TAG_SUGGEST_LIMIT,
  TAG_SUGGEST_MIN_QUERY_LENGTH,
} from '@universe/core/constants/tags';
import { normalizeTag } from '@universe/core/utils/tags';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async suggest(query: string) {
    const name = normalizeTag(query);

    if (name.length < TAG_SUGGEST_MIN_QUERY_LENGTH) return [];

    return this.prisma.tag.findMany({
      where: { name: { contains: name } },
      orderBy: [{ opportunities: { _count: 'desc' } }, { name: 'asc' }],
      take: TAG_SUGGEST_LIMIT,
      select: { id: true, name: true },
    });
  }
}
