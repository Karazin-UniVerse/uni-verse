import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  ApplyOpportunityDto,
  ModerateOpportunityDto,
  ModerateAction,
  FindOpportunitiesDto,
} from './dto';
import {
  OpportunityLifecycleState,
  ApplicationStatus,
  OpportunityStatus,
  Role,
} from '@universe/database';

export type UpdateApplicationStatusParams = {
  userId: string;
  applicationId: string;
  status: ApplicationStatus;
  ownerComment?: string;
};

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create a new opportunity as a draft
   */
  async create(userId: string, dto: CreateOpportunityDto) {
    return this.prisma.opportunity.create({
      data: {
        ...dto,
        ownerId: userId,
        status: OpportunityStatus.DRAFT, // initial status
      },
    });
  }

  /**
   * Find all opportunities matching the query.
   * If user is not moderator, only PUBLISHED opportunities are returned.
   */
  async findAll(query: FindOpportunitiesDto, userRole?: string) {
    const { paymentType, ownerId, search, status } = query;
    const where: Record<string, unknown> = {};

    if (
      status &&
      status !== OpportunityStatus.PUBLISHED &&
      userRole === Role.OPPORTUNITIES_MODERATOR
    ) {
      where.status = status;
    } else {
      where.status = OpportunityStatus.PUBLISHED;
    }

    if (paymentType) where.paymentType = paymentType;

    if (ownerId) where.ownerId = ownerId;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.opportunity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Retrieve an opportunity by ID.
   * Ensures that unpublished opportunities are only visible to their owners or moderators/admins.
   */
  async findOne(id: string, userId?: string, userRole?: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    if (!opportunity) throw new NotFoundException('Opportunity not found');

    if (
      opportunity.status !== OpportunityStatus.PUBLISHED &&
      opportunity.ownerId !== userId &&
      userRole !== Role.OPPORTUNITIES_MODERATOR
    ) {
      throw new NotFoundException('Opportunity not found');
    }

    return opportunity;
  }

  /**
   * Update an existing opportunity.
   * If it was already published, it is reverted to READY_FOR_REVIEW to prevent bypassing moderation.
   */
  async update(userId: string, id: string, dto: UpdateOpportunityDto) {
    const opportunity = await this.findOne(id, userId);

    if (opportunity.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only update your own opportunities',
      );
    }

    const {
      status: _status,
      moderationComment: _comment,
      ...safeDto
    } = dto as Record<string, unknown>;
    const data: Record<string, unknown> = { ...safeDto };

    if (opportunity.status === OpportunityStatus.PUBLISHED) {
      data.status = OpportunityStatus.READY_FOR_REVIEW;
    }

    return this.prisma.opportunity.update({
      where: { id },
      data,
    });
  }

  /**
   * Submit an opportunity for moderation.
   */
  async changeStatus(userId: string, id: string, status: OpportunityStatus) {
    const opportunity = await this.findOne(id, userId);

    if (opportunity.ownerId !== userId)
      throw new ForbiddenException('Not your opportunity');

    if (status !== OpportunityStatus.READY_FOR_REVIEW) {
      throw new BadRequestException(
        'Can only change status to READY_FOR_REVIEW',
      );
    }

    if (
      opportunity.status !== OpportunityStatus.DRAFT &&
      opportunity.status !== OpportunityStatus.REQUIRES_CHANGES
    ) {
      throw new BadRequestException(
        'Can only submit for review from DRAFT or REQUIRES_CHANGES status',
      );
    }

    return this.prisma.opportunity.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Update the lifecycle state of an opportunity (e.g., ACTIVE, CLOSED).
   */
  async changeLifecycleState(
    userId: string,
    id: string,
    lifecycleState: OpportunityLifecycleState,
  ) {
    const opportunity = await this.findOne(id, userId);

    if (opportunity.ownerId !== userId)
      throw new ForbiddenException('Not your opportunity');

    return this.prisma.opportunity.update({
      where: { id },
      data: { lifecycleState },
    });
  }

  /**
   * Retrieve all applications for a specific opportunity.
   */
  async getOpportunityApplications(userId: string, id: string) {
    const opportunity = await this.findOne(id, userId);

    if (opportunity.ownerId !== userId)
      throw new ForbiddenException('Only the owner can view applications');

    return this.prisma.opportunityApplication.findMany({
      where: { opportunityId: id },
      include: { applicant: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update the status of an application.
   */
  async updateApplicationStatus({
    userId,
    applicationId,
    status,
    ownerComment,
  }: UpdateApplicationStatusParams) {
    const app = await this.prisma.opportunityApplication.findUnique({
      where: { id: applicationId },
      include: { opportunity: true },
    });

    if (!app) throw new NotFoundException('Application not found');

    if (app.opportunity.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can manage this');
    }

    if (app.status === ApplicationStatus.WITHDRAWN) {
      throw new BadRequestException('Cannot change a withdrawn application');
    }

    const allowedStatuses: ApplicationStatus[] = [
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.ACCEPTED,
      ApplicationStatus.REJECTED,
    ];

    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException('Invalid target status');
    }

    const updated = await this.prisma.opportunityApplication.update({
      where: { id: applicationId },
      data: { status, ownerComment },
    });

    await this.notificationsService.createNotification({
      userId: app.applicantId,
      type: 'OPPORTUNITY_APPLICATION_STATUS',
      title: 'notifications.opportunityApplicationStatus.title',
      message: JSON.stringify({
        opportunityTitle: app.opportunity.title,
        status,
        comment: ownerComment || null,
      }),
      link: '/my-applications',
    });

    return updated;
  }

  /**
   * Apply to an opportunity.
   */
  async apply(userId: string, id: string, dto: ApplyOpportunityDto) {
    const opportunity = await this.findOne(id, userId);

    if (opportunity.status !== OpportunityStatus.PUBLISHED) {
      throw new BadRequestException(
        'Cannot apply to an unpublished opportunity',
      );
    }

    if (opportunity.lifecycleState !== OpportunityLifecycleState.ACTIVE) {
      throw new BadRequestException(
        'Cannot apply to an opportunity that is not active',
      );
    }

    const existing = await this.prisma.opportunityApplication.findFirst({
      where: { applicantId: userId, opportunityId: id },
    });

    if (existing) {
      throw new BadRequestException('Already applied to this opportunity');
    }

    let app;

    try {
      app = await this.prisma.opportunityApplication.create({
        data: {
          ...dto,
          applicantId: userId,
          opportunityId: id,
          status: ApplicationStatus.SUBMITTED,
        },
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as Record<string, unknown>).code === 'P2002'
      ) {
        throw new ConflictException('Already applied to this opportunity');
      }

      throw error;
    }

    await this.notificationsService.createNotification({
      userId: opportunity.ownerId,
      type: 'OPPORTUNITY_NEW_APPLICATION',
      title: 'notifications.opportunityNewApplication.title',
      message: JSON.stringify({
        opportunityTitle: opportunity.title,
        applicantName: dto.applicantName,
      }),
      link: `/my-opportunities/${id}`,
    });

    return app;
  }

  /**
   * Withdraw an application.
   */
  async withdrawApplication(userId: string, applicationId: string) {
    const app = await this.prisma.opportunityApplication.findUnique({
      where: { id: applicationId },
    });

    if (!app) throw new NotFoundException('Application not found');

    if (app.applicantId !== userId)
      throw new ForbiddenException('Only the applicant can withdraw');

    if (
      app.status === ApplicationStatus.ACCEPTED ||
      app.status === ApplicationStatus.REJECTED
    )
      throw new BadRequestException('Cannot withdraw completed application');

    return this.prisma.opportunityApplication.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.WITHDRAWN },
    });
  }

  /**
   * Retrieve all applications submitted by a user.
   */
  async getMyApplications(userId: string) {
    return this.prisma.opportunityApplication.findMany({
      where: { applicantId: userId },
      include: { opportunity: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieve all opportunities owned by a user.
   */
  async getMyOpportunities(userId: string) {
    return this.prisma.opportunity.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Moderate an opportunity. Enforces real-time role check from the database.
   */
  async moderate(userId: string, id: string, dto: ModerateOpportunityDto) {
    // Real-time role check to prevent using cached demoted admin tokens
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== Role.OPPORTUNITIES_MODERATOR) {
      throw new ForbiddenException(
        'Only OPPORTUNITIES_MODERATOR can moderate opportunities',
      );
    }

    const opportunityToModerate = await this.findOne(id, userId, user.role);

    if (opportunityToModerate.status !== OpportunityStatus.READY_FOR_REVIEW) {
      throw new BadRequestException(
        'Only opportunities in READY_FOR_REVIEW can be moderated',
      );
    }

    let newStatus: OpportunityStatus;

    if (dto.action === ModerateAction.APPROVE) {
      newStatus = OpportunityStatus.PUBLISHED;
    } else if (dto.action === ModerateAction.REJECT) {
      newStatus = OpportunityStatus.REJECTED;
    } else if (dto.action === ModerateAction.REQUIRE_CHANGES) {
      newStatus = OpportunityStatus.REQUIRES_CHANGES;
    } else {
      throw new BadRequestException('Unknown moderation action');
    }

    const opp = await this.prisma.opportunity.update({
      where: { id },
      data: {
        status: newStatus,
        moderationComment: dto.comment,
      },
    });

    await this.notificationsService.createNotification({
      userId: opp.ownerId,
      type: 'OPPORTUNITY_MODERATED',
      title: 'notifications.opportunityModerated.title',
      message: JSON.stringify({
        opportunityTitle: opp.title,
        action: dto.action,
        comment: dto.comment || null,
      }),
      link: '/my-opportunities',
    });

    return opp;
  }
}
