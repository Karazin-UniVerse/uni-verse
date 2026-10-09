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
import { Opportunity, OpportunityApplication } from '@universe/database';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Opportunities')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @ApiBearerAuth()
  @Post()
  /**
   * Create a new opportunity
   */
  @ApiOperation({ summary: 'Create a new opportunity' })
  create(
    @GetUser('sub') userId: string,
    @Body() dto: CreateOpportunityDto,
  ): Promise<Opportunity> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.create(userId, dto);
  }

  @Public()
  @ApiBearerAuth()
  @Get()
  /**
   * Get all published opportunities (or filter)
   */
  @ApiOperation({ summary: 'Get all published opportunities (or filter)' })
  findAll(
    @GetUser('role') role: string,
    @Query() query: FindOpportunitiesDto,
  ): Promise<Opportunity[]> {
    return this.opportunitiesService.findAll(query, role);
  }

  @ApiBearerAuth()
  @Get('my')
  /**
   * Get current user opportunities
   */
  @ApiOperation({ summary: 'Get current user opportunities' })
  getMyOpportunities(@GetUser('sub') userId: string): Promise<Opportunity[]> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.getMyOpportunities(userId);
  }

  @ApiBearerAuth()
  @Put('my/applications/:id/withdraw')
  /**
   * Applicant withdraws their application
   */
  @ApiOperation({ summary: 'Applicant withdraws their application' })
  withdrawApplication(
    @GetUser('sub') userId: string,
    @Param('id') applicationId: string,
  ): Promise<OpportunityApplication> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.withdrawApplication(userId, applicationId);
  }

  @ApiBearerAuth()
  @Get('my/applications')
  /**
   * Get current user applications
   */
  @ApiOperation({ summary: 'Get current user applications' })
  getMyApplications(
    @GetUser('sub') userId: string,
  ): Promise<OpportunityApplication[]> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.getMyApplications(userId);
  }

  @Public()
  @ApiBearerAuth()
  @Get(':id')
  /**
   * Get opportunity by ID
   */
  @ApiOperation({ summary: 'Get opportunity by ID' })
  findOne(
    @Param('id') id: string,
    @GetUser('sub') userId?: string,
    @GetUser('role') role?: string,
  ): Promise<Opportunity> {
    return this.opportunitiesService.findOne(id, userId, role);
  }

  @ApiBearerAuth()
  @Put(':id')
  /**
   * Update your opportunity
   */
  @ApiOperation({ summary: 'Update your opportunity' })
  update(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
  ): Promise<Opportunity> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.update(userId, id, dto);
  }

  @ApiBearerAuth()
  @Post(':id/status')
  /**
   * Owner sends opportunity to review
   */
  @ApiOperation({ summary: 'Owner sends opportunity to review' })
  changeStatus(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body('status') status: 'READY_FOR_REVIEW',
  ): Promise<Opportunity> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.changeStatus(userId, id, status);
  }

  @ApiBearerAuth()
  @Put(':id/lifecycle')
  /**
   * Owner changes lifecycle state
   */
  @ApiOperation({ summary: 'Owner changes lifecycle state' })
  changeLifecycleState(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: ChangeLifecycleStateDto,
  ): Promise<Opportunity> {
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
  ): Promise<OpportunityApplication[]> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.getOpportunityApplications(userId, id);
  }

  @ApiBearerAuth()
  @Put('applications/:appId/status')
  /**
   * Owner updates application status
   */
  @ApiOperation({ summary: 'Owner updates application status' })
  updateApplicationStatus(
    @GetUser('sub') userId: string,
    @Param('appId') appId: string,
    @Body() dto: UpdateApplicationStatusDto,
  ): Promise<OpportunityApplication> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.updateApplicationStatus({
      userId,
      applicationId: appId,
      status: dto.status,
      ownerComment: dto.comment,
    });
  }

  @ApiBearerAuth()
  @Post(':id/apply')
  /**
   * Apply to an opportunity
   */
  @ApiOperation({ summary: 'Apply to an opportunity' })
  apply(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: ApplyOpportunityDto,
  ): Promise<OpportunityApplication> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.apply(userId, id, dto);
  }

  @ApiBearerAuth()
  @Post(':id/moderate')
  /**
   * Moderate an opportunity (MODERATOR only)
   */
  @ApiOperation({ summary: 'Moderate an opportunity (MODERATOR only)' })
  moderate(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: ModerateOpportunityDto,
  ): Promise<Opportunity> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.moderate(userId, id, dto);
  }
}
