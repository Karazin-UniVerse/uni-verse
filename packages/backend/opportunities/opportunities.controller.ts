import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OpportunitiesService } from './opportunities.service';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  ApplyOpportunityDto,
  ModerateOpportunityDto,
  UpdateApplicationStatusDto,
  ChangeLifecycleStateDto,
  FindOpportunitiesDto,
} from './dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Opportunities')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a new opportunity' })
  create(
    @GetUser('sub') userId: string,
    @Body() dto: CreateOpportunityDto,
  ): Promise<unknown> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.create(userId, dto);
  }

  @Public()
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get all published opportunities (or filter)' })
  findAll(
    @GetUser('role') role: string,
    @Query() query: FindOpportunitiesDto,
  ): Promise<unknown> {
    return this.opportunitiesService.findAll(query, role);
  }

  @ApiBearerAuth()
  @Get('my')
  @ApiOperation({ summary: 'Get current user opportunities' })
  getMyOpportunities(@GetUser('sub') userId: string): Promise<unknown> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.getMyOpportunities(userId);
  }

  @ApiBearerAuth()
  @Put('my/applications/:id/withdraw')
  @ApiOperation({ summary: 'Applicant withdraws their application' })
  withdrawApplication(
    @GetUser('sub') userId: string,
    @Param('id') applicationId: string,
  ): Promise<unknown> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.withdrawApplication(userId, applicationId);
  }

  @ApiBearerAuth()
  @Get('my/applications')
  @ApiOperation({ summary: 'Get current user applications' })
  getMyApplications(@GetUser('sub') userId: string): Promise<unknown> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.getMyApplications(userId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get opportunity by ID' })
  findOne(@Param('id') id: string): Promise<unknown> {
    return this.opportunitiesService.findOne(id);
  }

  @ApiBearerAuth()
  @Put(':id')
  @ApiOperation({ summary: 'Update your opportunity' })
  update(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
  ): Promise<unknown> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.update(userId, id, dto);
  }

  @ApiBearerAuth()
  @Post(':id/status')
  @ApiOperation({ summary: 'Owner sends opportunity to review' })
  changeStatus(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body('status') status: 'READY_FOR_REVIEW',
  ): Promise<unknown> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.changeStatus(userId, id, status);
  }

  @ApiBearerAuth()
  @Put(':id/lifecycle')
  @ApiOperation({ summary: 'Owner changes lifecycle state' })
  changeLifecycleState(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: ChangeLifecycleStateDto,
  ): Promise<unknown> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.changeLifecycleState(
      userId,
      id,
      dto.lifecycleState,
    );
  }

  @ApiBearerAuth()
  @Get(':id/applications')
  @ApiOperation({
    summary: 'Owner gets all applications for their opportunity',
  })
  getOpportunityApplications(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<unknown> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.getOpportunityApplications(userId, id);
  }

  @ApiBearerAuth()
  @Put('applications/:appId/status')
  @ApiOperation({ summary: 'Owner updates application status' })
  updateApplicationStatus(
    @GetUser('sub') userId: string,
    @Param('appId') appId: string,
    @Body() dto: UpdateApplicationStatusDto,
  ): Promise<unknown> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.updateApplicationStatus(
      userId,
      appId,
      dto.status,
      dto.comment,
    );
  }

  @ApiBearerAuth()
  @Post(':id/apply')
  @ApiOperation({ summary: 'Apply to an opportunity' })
  apply(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: ApplyOpportunityDto,
  ): Promise<unknown> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.apply(userId, id, dto);
  }

  @ApiBearerAuth()
  @Post(':id/moderate')
  @ApiOperation({ summary: 'Moderate an opportunity (MODERATOR only)' })
  moderate(
    @GetUser('role') role: string,
    @Param('id') id: string,
    @Body() dto: ModerateOpportunityDto,
  ): Promise<unknown> {
    if (role !== 'MODERATOR' && role !== 'ADMIN') {
      throw new ForbiddenException('Only MODERATOR can moderate opportunities');
    }

    return this.opportunitiesService.moderate(id, dto);
  }
}
