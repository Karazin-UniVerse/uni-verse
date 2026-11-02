import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TagsService } from './tags.service';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'Suggest existing tags by name' })
  async suggest(
    @Query('query') query?: string | string[],
  ): Promise<Array<{ id: string; name: string }>> {
    return this.tagsService.suggest(typeof query === 'string' ? query : '');
  }
}
