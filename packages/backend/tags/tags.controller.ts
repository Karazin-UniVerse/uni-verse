import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { TagsService } from './tags.service';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Suggest existing tags by name' })
  async suggest(
    @Query('query') query = '',
  ): Promise<Array<{ id: string; name: string }>> {
    return this.tagsService.suggest(query);
  }
}
