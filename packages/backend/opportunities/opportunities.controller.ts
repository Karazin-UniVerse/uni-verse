import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  Res,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  OpportunitiesService,
  OpportunityWithOwner,
  ApplicationWithApplicant,
  ApplicationWithOpportunity,
} from './opportunities.service';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  ApplyOpportunityDto,
  ModerateOpportunityDto,
  UpdateApplicationStatusDto,
  ChangeLifecycleStateDto,
  ChangeOpportunityStatusDto,
  FindOpportunitiesDto,
} from './dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import {
  Opportunity,
  OpportunityApplication,
  OpportunityStatus,
} from '@universe/database';
import { Public } from '../auth/decorators/public.decorator';
import type {
  UnavailableOpportunity,
  OpportunityFavoriteState,
} from '@universe/core/types/opportunities';

const CACHE_CONTROL_HEADER = 'Cache-Control';
const PUBLIC_CACHE_CONTROL =
  'public, max-age=30, s-maxage=60, stale-while-revalidate=120';
const PRIVATE_CACHE_CONTROL = 'private, no-cache, no-store, must-revalidate';

function setOpportunityCacheControl(
  res: Response | undefined,
  isPublic: boolean,
): void {
  res?.setHeader(
    CACHE_CONTROL_HEADER,
    isPublic ? PUBLIC_CACHE_CONTROL : PRIVATE_CACHE_CONTROL,
  );
}

@ApiTags('Opportunities')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @ApiBearerAuth()
  @Get('favorites')
  @ApiOperation({
    summary:
      'Get current user favorite opportunities, including unavailable summaries',
  })
  getFavorites(
    @GetUser('sub') userId: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<(OpportunityWithOwner | UnavailableOpportunity)[]> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    setOpportunityCacheControl(res, false);

    return this.opportunitiesService.getFavorites(userId);
  }

  @ApiBearerAuth()
  @Put(':id/favorite')
  @ApiOperation({ summary: 'Save a published opportunity' })
  addFavorite(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<OpportunityFavoriteState> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.addFavorite(userId, id);
  }

  @ApiBearerAuth()
  @Delete(':id/favorite')
  @ApiOperation({
    summary: 'Remove a favorite regardless of moderation status',
  })
  removeFavorite(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<OpportunityFavoriteState> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.removeFavorite(userId, id);
  }

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
  async findAll(
    @GetUser('roles') roles: string[] | undefined,
    @Query() query: FindOpportunitiesDto,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<OpportunityWithOwner[]> {
    const opportunities = await this.opportunitiesService.findAll(query, roles);
    const isPublicCatalog =
      !query.status || query.status === OpportunityStatus.PUBLISHED;

    setOpportunityCacheControl(res, isPublicCatalog);

    return opportunities;
  }

  @ApiBearerAuth()
  @Get('my')
  /**
   * Get current user opportunities
   */
  @ApiOperation({ summary: 'Get current user opportunities' })
  getMyOpportunities(
    @GetUser('sub') userId: string,
  ): Promise<OpportunityWithOwner[]> {
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
    @GetUser('roles') roles: string[] = [],
  ): Promise<ApplicationWithOpportunity[]> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.getMyApplications(userId, roles);
  }

  @Public()
  @ApiBearerAuth()
  @Get(':id')
  /**
   * Get opportunity by ID
   */
  @ApiOperation({ summary: 'Get opportunity by ID' })
  async findOne(
    @Param('id') id: string,
    @GetUser('sub') userId?: string,
    @GetUser('roles') roles?: string[],
    @Res({ passthrough: true }) res?: Response,
  ): Promise<OpportunityWithOwner | UnavailableOpportunity> {
    let opportunity: OpportunityWithOwner | UnavailableOpportunity;

    try {
      opportunity = await this.opportunitiesService.findOne(id, userId, roles);
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }

      opportunity = await this.opportunitiesService.getUnavailablePreview(id);
    }

    setOpportunityCacheControl(
      res,
      !('availability' in opportunity) &&
        opportunity.status === OpportunityStatus.PUBLISHED,
    );

    return opportunity;
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
  @Delete(':id')
  /**
   * Owner deletes draft opportunity
   */
  @ApiOperation({ summary: 'Owner deletes a draft opportunity' })
  delete(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<Opportunity> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.delete(userId, id);
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
    @Body() dto: ChangeOpportunityStatusDto,
  ): Promise<Opportunity> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.changeStatus(userId, id, dto.status);
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
  ): Promise<ApplicationWithApplicant[]> {
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
   * Moderate an opportunity (OPPORTUNITIES_MODERATOR only)
   */
  @ApiOperation({
    summary: 'Moderate an opportunity (OPPORTUNITIES_MODERATOR only)',
  })
  moderate(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: ModerateOpportunityDto,
  ): Promise<Opportunity> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.opportunitiesService.moderate(userId, id, dto);
  }
}
