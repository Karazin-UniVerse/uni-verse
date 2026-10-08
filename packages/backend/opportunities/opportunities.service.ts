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
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Create a new opportunity as a draft
   */
  async create(userId: string, dto: CreateOpportunityDto) {
    return this.prisma.opportunity.create({
      data: {
        ...dto,
        ownerId: userId,
        status: 'DRAFT', // initial status
      },
    });
  }

  /**
   * Find all opportunities matching the query.
   * If user is not moderator/admin, only PUBLISHED opportunities are returned.
   */
  async findAll(query: FindOpportunitiesDto, userRole?: string) {
    const { paymentType, ownerId, search, status } = query;
    const where: Record<string, unknown> = {};

    if (
      status &&
      status !== 'PUBLISHED' &&
      (userRole === 'MODERATOR' || userRole === 'ADMIN')
    ) {
      where.status = status;
    } else {
      where.status = 'PUBLISHED';
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
      opportunity.status !== 'PUBLISHED' &&
      opportunity.ownerId !== userId &&
      userRole !== 'MODERATOR' &&
      userRole !== 'ADMIN'
    ) {
      throw new ForbiddenException('Access denied to unpublished opportunity');
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

    if (opportunity.status === 'PUBLISHED') {
      data.status = 'READY_FOR_REVIEW';
    }

    return this.prisma.opportunity.update({
      where: { id },
      data,
    });
  }

  /**
   * Submit an opportunity for moderation.
   */
  async changeStatus(userId: string, id: string, status: 'READY_FOR_REVIEW') {
    const opportunity = await this.findOne(id, userId);

    if (opportunity.ownerId !== userId)
      throw new ForbiddenException('Not your opportunity');

    if (status !== 'READY_FOR_REVIEW') {
      throw new BadRequestException(
        'Can only change status to READY_FOR_REVIEW',
      );
    }

    if (
      opportunity.status !== 'DRAFT' &&
      opportunity.status !== 'REQUIRES_CHANGES'
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

    if (app.opportunity.ownerId !== userId)
      throw new ForbiddenException('Only the owner can manage this');

    const updated = await this.prisma.opportunityApplication.update({
      where: { id: applicationId },
      data: { status, ownerComment },
    });

    let statusText: string = status;

    if (status === 'ACCEPTED') statusText = 'принят';

    if (status === 'REJECTED') statusText = 'отклонен';

    if (status === 'UNDER_REVIEW') statusText = 'на рассмотрении';

    await this.notificationsService.createNotification({
      userId: app.applicantId,
      title: 'Статус отклика изменен',
      message: `Ваш отклик на "${app.opportunity.title}" теперь ${statusText}.${ownerComment ? ` Комментарий: ${ownerComment}` : ''}`,
      link: `/my-applications`,
    });

    return updated;
  }

  /**
   * Apply to an opportunity.
   */
  async apply(userId: string, id: string, dto: ApplyOpportunityDto) {
    const opportunity = await this.findOne(id, userId);

    if (opportunity.status !== 'PUBLISHED') {
      throw new BadRequestException(
        'Cannot apply to an unpublished opportunity',
      );
    }

    if (opportunity.lifecycleState !== 'ACTIVE') {
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
          status: 'SUBMITTED',
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
      title: 'Новый отклик!',
      message: `Пользователь ${dto.applicantName} откликнулся на вашу возможность "${opportunity.title}".`,
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

    if (app.status === 'ACCEPTED' || app.status === 'REJECTED')
      throw new BadRequestException('Cannot withdraw completed application');

    return this.prisma.opportunityApplication.update({
      where: { id: applicationId },
      data: { status: 'WITHDRAWN' },
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

    if (!user || (user.role !== 'MODERATOR' && user.role !== 'ADMIN')) {
      throw new ForbiddenException(
        'Only MODERATOR or ADMIN can moderate opportunities',
      );
    }

    const opportunityToModerate = await this.findOne(id, userId, user.role);

    if (opportunityToModerate.status !== 'READY_FOR_REVIEW') {
      throw new BadRequestException(
        'Only opportunities in READY_FOR_REVIEW can be moderated',
      );
    }

    let newStatus: OpportunityStatus;
    let actionText = '';

    if (dto.action === ModerateAction.APPROVE) {
      newStatus = 'PUBLISHED';
      actionText = 'одобрена';
    } else if (dto.action === ModerateAction.REJECT) {
      newStatus = 'REJECTED';
      actionText = 'отклонена';
    } else if (dto.action === ModerateAction.REQUIRE_CHANGES) {
      newStatus = 'REQUIRES_CHANGES';
      actionText = 'возвращена на правки';
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
      title: `Возможность ${actionText}`,
      message: `Ваша возможность "${opp.title}" была ${actionText} модератором.${dto.comment ? ` Комментарий: ${dto.comment}` : ''}`,
      link: `/my-opportunities`,
    });

    return opp;
  }
}
